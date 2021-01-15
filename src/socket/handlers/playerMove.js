import Lobby from "../../models/game";
import Player from "../../models/user";
import {error, Game, ClientEvents, MoveTypes, GameStatus} from "shared";

// TODO: event should be atomic
async function handler(context, socket, io) {
    const lobby = await Lobby.findOne({pin: socket.lobby.pin});

    // get the game object
    const game = Game.fromState(lobby.game);

    // If the game has already finished, any further requests are stale.
    if (game.hasVictory) {
        return socket.emit(ClientEvents.ERROR, {
            "status": false,
            "type": ClientEvents.STALE_GAME,
            message: "Game has finished."
        });
    }

    // find the player in the database record by the socket id...
    const {name} = socket.decoded;
    const player = game.players.get(name);

    if (!player) {
        return socket.emit(ClientEvents.ERROR, {
            status: false,
            type: error.BAD_REQUEST,
            message: error.SOCKET_INVALID_SESSION,
        });
    }

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
                    return socket.emit(ClientEvents.ERROR, {
                        "status": false,
                        "type": ClientEvents.INVALID_MOVE,
                        message: "Invalid move type."
                    });
                }
            }
        }
    } catch (e) {
        console.log(e);

        // Send the client the 'safe' state and don't save the game.
        return socket.emit(ClientEvents.INVALID_MOVE, game.getStateForPlayer(name));
    }

    // save the game into mongo
    await Lobby.updateOne({_id: socket.lobby._id}, {game: game.serialize()});

    // iterate over each socket id in the 'namespace' that is connected and send them
    // the cards...
    game.players.forEach(((value, key) => {
        const socketId = lobby.players.find(p => p.name === key).socketId;

        // send each player their cards, round metadata, etc...
        // TODO: notify of the action that just occurred for all players.
        //      For example, if the player 'alex' covers a card on pos 0
        //      with "Jack of Spades', this information should be passed onto
        //      the clients.
        try {
            io.of(lobby.pin.toString()).sockets.get(socketId).emit(ClientEvents.ACTION, game.getStateForPlayer(key));
        } catch (e) {
            console.log(`Stale connection on ${lobby.pin}: socketId=${socketId}, player=${p.name}`)
        }
    }));

    // Finally, check for a victory condition, if the game is finished, emit a 'victory' event
    // and update the lobby state to 'waiting'
    if (!game.victory) return;

    const owner = await Player.findOne({_id: lobby.owner});

    // list the players by exit order
    // TODO: cleanup
    io.of(lobby.pin.toString()).emit(ClientEvents.VICTORY, {
        players: Array.from(game.players.keys())
            .map(name => {
                const player = game.players.get(name);

                return {
                    name,
                    ...player,
                    //transform 'null' value into largest current timestamp
                    ...(player.out === null && {out: Date.now()})
                }
            })
            .sort((a, b) => (a.out > b.out) ? 1 : -1)
    });

    // TODO: maybe archive the games so they can be replayed
    // reset all the player connections but the owner, reset game and game state.
    await Lobby.findOneAndUpdate({_id: lobby._id}, {
        "$set": {
            "players": lobby.players.map((player) => {
                if (player.name !== owner.name) {
                    return {
                        _id: player.id,
                        name: player.name,
                        socketId: "",
                        confirmed: false,
                        registered: player.registered,
                    }
                }
                return player;
            }),
            status: GameStatus.WAITING,
            game: {}
        },
    });
}

export default handler;
