import {ClientEvents, error, GameStatus, ServerEvents} from "shared";
import Lobby from "../../models/game";
import * as lobbyUtils from "../../utils/lobby";
import Player from "../../models/user";

async function handler(context, socket, io) {
    if (!socket.isAdmin) socket.emit(ClientEvents.ERROR, new Error(error.UNAUTHORIZED));

    const lobby = await Lobby.findOne({pin: socket.lobby.pin});
    const owner = await Player.findOne({_id: lobby.owner});

    // check that we're currently waiting for players as the admin
    // cannot kick players once the game has started.
    if (lobby.status !== GameStatus.WAITING) {
        return socket.emit(ClientEvents.ERROR, {
            "status": false,
            type: error.BAD_REQUEST,
            message: "can't kick player when playing."
        });
    }

    // check that the player 'name' is present in the current lobby
    const players = lobby.players;
    const index = players.findIndex((player) => player._id.toString() === context.id);


    // can't kick non-existent player or owner
    if (index < 0 || players[index].name === owner.name) {
        return socket.emit(ClientEvents.ERROR, {"status": false, "type": "bad_request", message: "Invalid player."});
    }

    // otherwise disconnect the socket from the current namespace.
    const kickedPlayerSocket = io.of(lobby.pin).sockets.get(players[index].socketId);

    if (typeof kickedPlayerSocket === 'undefined') {
        players.splice(index, 1);

        // update mongo with new player list and send out update about players
        const updatedLobby = await Lobby.findOneAndUpdate(
            {_id: lobby._id},
            {$set: {players}},
            {new: true}
        );

        // notify all other clients that a new player has joined the lobby...
        return socket.broadcast.emit(ServerEvents.NEW_PLAYER, {
            lobby: {
                players: lobbyUtils.buildPlayerList(updatedLobby, false),
                owner: owner.name,
            }
        });
    } else {
        kickedPlayerSocket.emit(ClientEvents.CLOSE, {"reason": "kicked", "extra": "sorry."});
        kickedPlayerSocket.disconnect();
    }
}

export default handler;
