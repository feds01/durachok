import Lobby from "../../models/game";
import {events, game} from "shared";
import * as lobbyUtils from "../../utils/lobby";

async function handler(context, socket) {
    // if the socket connection is not an admin, we need to remove it from
    // the player lobby and free up a space.
    if (!socket.isAdmin) {
        const lobby = await Lobby.findOne({pin: socket.lobby.pin});

        // The lobby might of been deleted...
        if (lobby === null) {
            return;
        }

        // TODO: what happens when the game is in progress and one of the players leave?
        //       .
        //       1). Potentially, the game has to be restarted and some condition is used to
        //       determine which player leaves when winning the lobby.
        //       .
        //       2). A secondary solution is to use a bot service that plays for the other
        //           player when the original player leaves...
        if (lobby.status === game.GameState.PLAYING) {
            console.log("Removing player from game whilst in session...");
        }

        // Remove the player from the list
        if (lobby.status === game.GameState.WAITING) {
            const players = lobby.players;
            const playerIdx = players.findIndex((player) => player.socketId === socket.id);

            // Should not happen but if it does we shouldn't proceed...
            if (playerIdx < 0) {
                return;
            }

            players.splice(playerIdx, 1);

            // update mongo with new player list and send out update about players
            const updatedLobby = await Lobby.findOneAndUpdate(
                {_id: socket.lobby._id},
                {$set: {'players': players}},
                {new: true}
            );

            // notify all other clients that a new player has joined the lobby...
            socket.broadcast.emit(events.NEW_PLAYER, {
                lobby: {
                    players: await lobbyUtils.buildPlayerList(updatedLobby),
                    owner: socket.lobby.name,
                }
            });
        }
    }
}

export default handler;
