import {Server, Socket} from "socket.io";
import {getLobby} from "../getLobby";
import {error, Game, ClientEvents, ServerEvents} from "shared";

async function handler(context: any, socket: Socket, io?: Server | null) {
    const meta = {pin: socket.lobby.pin, event: ServerEvents.SURRENDER};

    const lobby = await getLobby(socket.lobby.pin);

    socket.logger.info("Processing player resign", {...meta, context, name: socket.decoded.name});

    // get the game object
    const game = Game.fromState(lobby.game!.state, lobby.game!.history);

    // If the game has already finished, any further requests are stale.
    if (game.victory) {
        socket.logger.warn("Can't process a move for a finalised game", {...meta, name: socket.decoded.name});

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
        socket.logger.warn("Non-existent player tried to send move", {...meta, name: socket.decoded.name});

        return socket.emit(ClientEvents.ERROR, {
            status: false,
            type: error.BAD_REQUEST,
            message: error.SOCKET_INVALID_SESSION,
        });
    }
}

export default handler;
