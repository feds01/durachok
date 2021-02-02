import {getLobby} from "../getLobby";
import User from "../../models/user";
import {Server, Socket} from "socket.io";
import Lobby, {Player} from "../../models/game";
import {acquireLock, releaseLock} from "../lock";
import {error, Game, ClientEvents, MoveTypes, GameStatus, ServerEvents} from "shared";

async function handler(context: any, socket: Socket, io?: Server | null) {
    const meta = {pin: socket.lobby.pin, event: ServerEvents.MOVE};

    const lobby = await getLobby(socket.lobby.pin);
    const game = Game.fromState(lobby.game!.state, lobby.game!.history);

    socket.logger.info("Processing player move", {...meta, context, name: socket.decoded.name});

    // If the game has already finished, any further requests are stale.
    if (game.victory) {
        socket.logger.warn("Can't process a move for a finalised game", {...meta, context, name: socket.decoded.name});

        return socket.emit(ClientEvents.ERROR, {
            "status": false,
            "type": ClientEvents.STALE_GAME,
            message: "Game has finished."
        });
    }

    // find the player in the database record by the name in the socket token..
    const {name} = socket.decoded;
    const player = game.players.get(name);

    if (!player) {
        socket.logger.warn("Non-existent player tried to send move", {...meta, name: socket.decoded.name});

        return socket.emit(ClientEvents.ERROR, {
            status: false,
            type: error.BAD_REQUEST,
            message: error.SOCKET_INVALID_SESSION,
        });
    }

    let lock;

    try {
        lock = acquireLock(socket.lobby.pin);
    } catch (e) {
        socket.logger.warn("Failed to acquire lock", {...meta, name: socket.decoded.name});
        // failed to acquire lock, this shouldn't matter since a new state
        // will be propagated to all clients from events that have acquired the
        // lock
        return socket.emit(ClientEvents.INVALID_MOVE, {update: game.getStateForPlayer(name)});

    }

    const node = game.history.getLastNode();
    const size = node!.getSize();

    try {
        if (player.isDefending) {
            switch (context.type) {
                case MoveTypes.COVER: {
                    game.coverCardOnTableTop(context.card, context.pos);
                    break;
                }
                case MoveTypes.PLACE: {
                    game.addCardToTableTop(name, context.card);
                    break;
                }
                case MoveTypes.FORFEIT: {
                    game.finalisePlayerTurn(name);
                    break;
                }
                default: {
                    socket.logger.warn("Can't process invalid event", {...meta, name: socket.decoded.name});
                    releaseLock(lock);

                    return socket.emit(ClientEvents.ERROR, {
                        "status": false,
                        "type": ClientEvents.INVALID_MOVE,
                        message: "Invalid move type."
                    });
                }
            }
        } else {

            // If the player is attempting to attack (MoveType of 'place) but they aren't allowed
            // to attack at this time (for example at the start of the round) this is reported as
            // being invalid
            if (!player.canAttack && context.type !== MoveTypes.FORFEIT) {
                socket.logger.warn("Can't process invalid event", {...meta, name: socket.decoded.name});
                releaseLock(lock);

                return socket.emit(ClientEvents.ERROR, {
                    "status": false,
                    "type": ClientEvents.INVALID_MOVE,
                    message: "Can't perform action at this time."
                });
            }

            switch (context.type) {
                case MoveTypes.PLACE: {
                    game.addCardToTableTop(name, context.card);
                    break;
                }
                case MoveTypes.FORFEIT: {
                    // just set the players 'turned' status as true
                    game.finalisePlayerTurn(name);
                    break;
                }

                // check for improper request combinations such as a 'attacking' player
                // trying to cover a card on the table...
                default: {
                    socket.logger.warn("Can't process invalid event", {...meta, name: socket.decoded.name});
                    releaseLock(lock);

                    return socket.emit(ClientEvents.ERROR, {
                        "status": false,
                        "type": ClientEvents.INVALID_MOVE,
                        message: "Invalid move type."
                    });
                }
            }
        }
    } catch (e) {
        socket.logger.error(`Failed to process move event: ${e.message}`, {...meta, err: e, name: socket.decoded.name});
        releaseLock(lock);

        // Re-create the game object to avoid any state mutation from a failed move
        const game = Game.fromState(lobby.game!.state, lobby.game!.history);

        // Send the client the 'safe' state and don't save the game.
        return socket.emit(ClientEvents.INVALID_MOVE, {update: game.getStateForPlayer(name)});
    }

    // save the game into mongo
    await Lobby.updateOne({_id: socket.lobby._id}, {game: game.serialize()});

    // Compute any history changes we need to propagate to the client... We use the size the here
    const actions = node!.actions.slice(size);

    // we'll need to add the 'new_round' event to the action list if the round ended
    if (node!.finalised) {
        actions.push(...game.history.getLastNode()!.actions);
    }

    socket.logger.info("Processed move event", {...meta, name: socket.decoded.name});

    // iterate over each socket id in the 'namespace' that is connected and send them the cards...
    game.players.forEach(((value, key) => {
        const socketId = lobby.players.find(p => p.name === key)!.socketId;

        // This shouldn't happen, but if it does we should prevent trying to send a
        // message to a null client.
        if (!socketId) return;

        // send each player their cards, round metadata, etc...
        try {
            io!.of(lobby.pin.toString()).sockets.get(socketId)!.emit(ClientEvents.ACTION, {
                actions, update: game.getStateForPlayer(key)
            });
        } catch (e) {
            socket.logger.warn("Detected a stale connection", {...meta, name: key});
        }
    }));

    // Finally, check for a victory condition, if the game is finished, emit a 'victory' event
    // and update the lobby state to 'waiting'
    if (!game.victory) {
        // Release the lock
        return releaseLock(lock);
    }

    const owner = await User.findOne({_id: lobby.owner});

    // If the lobby was deleted, we shouldn't continue
    if (!owner) {
        socket.logger.error("Couldn't find lobby owner", meta);
        releaseLock(lock);

        return socket.emit(ClientEvents.ERROR, {error: error.INTERNAL_SERVER_ERROR});
    }

    // list the players by exit order
    io!.of(lobby.pin.toString()).emit(ClientEvents.VICTORY, {
        players: Array.from(game.players.keys())
            .map(name => {
                const player = game.getPlayer(name);

                return {
                    name, ...player, ...(player.out === null && {out: Date.now()}) // transform 'null' value into largest current timestamp
                }
            })
            .sort((a, b) => (a.out! > b.out!) ? 1 : -1)
    });

    // TODO: maybe archive the games so they can be replayed
    // reset all the player connections but the owner, reset game and game state.
    await Lobby.findOneAndUpdate({_id: lobby._id}, {
        "$set": {
            "players": lobby.players.map((player: Player): Player => {
                if (player.name !== owner.name) {
                    return {
                        name: player.name,
                        socketId: "",
                        confirmed: false,
                        registered: player.registered,
                    } as Player;
                }
                return player;
            }),
            status: GameStatus.WAITING,
            game: null,
        },
    });

    // the lock wasn't released since this is a victory condition
    return releaseLock(lock);
}

export default handler;
