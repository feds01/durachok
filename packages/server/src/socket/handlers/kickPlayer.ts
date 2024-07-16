import {getLobby} from "../getLobby";
import Lobby from "../../models/game";
import Player from "../../models/user";
import {Server, Socket} from "socket.io";
import * as lobbyUtils from "../../utils/lobby";
import {ClientEvents, error, GameStatus, ServerEvents} from "shared";

async function handler(context: any, socket: Socket, io?: Server | null) {
    const meta = {pin: socket.lobby.pin, event: ServerEvents.KICK_PLAYER};

    if (!socket.isAdmin) socket.emit(ClientEvents.ERROR, new Error(error.UNAUTHORIZED));

    const lobby = await getLobby(socket.lobby.pin);
    const owner = await Player.findOne({_id: lobby.owner});

    if (!owner) {
        return socket.emit(ClientEvents.ERROR, {error: error.INTERNAL_SERVER_ERROR});
    }

    socket.logger.info("Attempting to kick user from a lobby", meta);

    // check that we're currently waiting for players as the admin
    // cannot kick players once the game has started.
    if (lobby.status !== GameStatus.WAITING) {
        socket.logger.info("Couldn't kick player from lobby since it's currently in game", meta);
        return socket.emit(ClientEvents.ERROR, {
            "status": false,
            type: error.BAD_REQUEST,
            message: "can't kick player when playing."
        });
    }

    // check that the player 'name' is present in the current lobby
    const players = lobby.players;
    const index = players.findIndex((player) => player.id.toString() === context.id);

    // can't kick non-existent player or owner
    if (index < 0 || players[index].name === owner.name) {
        socket.logger.warn("Failed to kick player from lobby because the don't exist", meta);

        return socket.emit(ClientEvents.ERROR, {"status": false, "type": "bad_request", message: "Invalid player."});
    }

    if (players[index].socketId) {
        const kickedPlayerSocket = io!.of(lobby.pin).sockets.get(players[index].socketId!);

        // otherwise disconnect the socket from the current namespace.
        if (kickedPlayerSocket) {
            socket.logger.info("Kicked player from lobby", {...meta, name: kickedPlayerSocket.decoded!.name});

            kickedPlayerSocket.emit(ClientEvents.CLOSE, {"reason": "kicked", "extra": "sorry."});
            kickedPlayerSocket.disconnect();
        }
    }

    // Maybe the user never connected or disconnected from the namespace.
    socket.logger.info("Removing player entry from namespace", meta);
    players.splice(index, 1);

    // update mongo with new player list and send out update about players
    const updatedLobby = await Lobby.findOneAndUpdate(
        {_id: lobby._id},
        {$set: {players}},
        {new: true}
    );

    // notify all other clients that a new player has joined the lobby...
    return socket.broadcast.emit(ClientEvents.NEW_PLAYER, {
        lobby: {
            players: lobbyUtils.buildPlayerList(updatedLobby!, false),
            owner: owner.name,
        }
    });
}

export default handler;
