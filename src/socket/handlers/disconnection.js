import Lobby from "../../models/game";
import * as lobbyUtils from "../../utils/lobby";
import {ClientEvents, GameStatus} from "shared";

async function handler(context, socket) {
    // if the socket connection is not an admin, we need to remove it from
    // the player lobby and free up a space.
    if (!socket.isAdmin) {
        const lobby = await Lobby.findOne({pin: socket.lobby.pin});

        // The lobby might of been deleted...
        if (lobby === null) return;

        // Remove the player from the list
        if (lobby.status === GameStatus.WAITING) {
            const players = lobby.players;
            const playerIdx = players.findIndex((player) => player.socketId === socket.id);

            // Should not happen but if it does we shouldn't proceed...
            if (playerIdx < 0) return;

            players.splice(playerIdx, 1);

            // update mongo with new player list and send out update about players
            const updatedLobby = await Lobby.findOneAndUpdate(
                {_id: socket.lobby._id},
                {$set: {'players': players}},
                {new: true}
            );

            // notify all other clients that a new player has joined the lobby...
            socket.broadcast.emit(ClientEvents.NEW_PLAYER, {
                lobby: {
                    players: lobbyUtils.buildPlayerList(updatedLobby, false),
                    owner: socket.lobby.name,
                }
            });
        }
    }
}

export default handler;
