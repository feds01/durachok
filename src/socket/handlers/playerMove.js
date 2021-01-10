import Lobby from "../../models/game";
import {error, events, game} from "shared";

// TODO: event should be atomic
async function handler(context, socket, io) {
    const lobby = await Lobby.findOne({pin: socket.lobby.pin});

    // get the game object
    const Game = game.Game.fromState(lobby.game);

    // find the player in the database record by the socket id...
    const {name} = socket.decoded;
    const player = Game.players.get(name);

    if (!player) {
        return socket.emit(events.ERROR, {
            status: false,
            type: error.BAD_REQUEST,
            message: error.SOCKET_INVALID_SESSION,
        });
    }

    try {
        if (player.isDefending) {
            switch (context.type) {
                case game.Game.MoveTypes.COVER: {
                    Game.coverCardOnTableTop(context.card, context.pos);
                    break;
                }
                case game.Game.MoveTypes.PLACE: {
                    Game.addCardToTableTop(name, context.card);
                    break;
                }
                case game.Game.MoveTypes.FORFEIT: {
                    Game.finalisePlayerTurn(name);
                    break;
                }
                default: {
                    return socket.emit(events.ERROR, {
                        "status": false,
                        "type": events.INVALID_MOVE,
                        message: "Invalid move type."
                    });
                }
            }
        } else {

            // If the player is attempting to attack (MoveType of 'place) but they aren't allowed
            // to attack at this time (for example at the start of the round) this is reported as
            // being invalid
            if (!player.canAttack) {
                return socket.emit(events.ERROR, {
                    "status": false,
                    "type": events.INVALID_MOVE,
                    message: "Can't perform action at this time."
                });
            }

            switch (context.type) {
                case game.Game.MoveTypes.PLACE: {
                    Game.addCardToTableTop(name, context.card);
                    break;
                }
                case game.Game.MoveTypes.FORFEIT: {
                    // just set the players 'turned' status as true
                    Game.finalisePlayerTurn(name);
                    break;
                }

                // check for improper request combinations such as a 'attacking' player
                // trying to cover a card on the table...
                default: {
                    return socket.emit(events.ERROR, {
                        "status": false,
                        "type": events.INVALID_MOVE,
                        message: "Invalid move type."
                    });
                }
            }
        }
    } catch (e) {
        console.log(e);

        // Send the client the 'safe' state and don't save the game.
        return socket.emit(events.INVALID_MOVE, Game.getStateForPlayer(name));
    }

    // save the game into mongo
    await Lobby.updateOne({_id: socket.lobby._id}, {game: Game.serialize()});

    // iterate over each socket id in the 'namespace' that is connected and send them
    // the cards...
    Game.players.forEach(((value, key) => {
        const socketId = lobby.players.find(p => p.name === key).socketId;

        // send each player their cards, round metadata, etc...
        // TODO: notify of the action that just occurred for all players.
        //      For example, if the player 'alex' covers a card on pos 0
        //      with "Jack of Spades', this information should be passed onto
        //      the clients.
        io.of(lobby.pin.toString()).sockets.get(socketId).emit(events.ACTION,  Game.getStateForPlayer(key));
    }));
}

export default handler;
