import Lobby from "../../models/game";
import {error, events, game} from "shared";
import * as lobbyUtils from "../../utils/lobby";
import Player from "../../models/user";

async function handler(context, socket) {
    const lobby = await Lobby.findOne({pin: socket.lobby.pin});
    socket.lobby = lobby;

    // update the players object for the game with the socket id
    const players = lobby.players;
    const idx = players.findIndex((player) => player.name === socket.decoded.name);

    // Couldn't find the player by name...
    if (idx < 0) {
        socket.emit("close", {"reason": "Invalid session."});
        return socket.disconnect();
    }

    // set socket id and set the player as 'confirmed' for the lobby.
    players[idx] = {name: players[idx].name, _id: players[idx]._id, socketId: socket.id, confirmed: true};

    const updatedLobby = await Lobby.findOneAndUpdate(
        {_id: lobby._id},
        {$set: {'players': players}},
        {new: true}
    );

    const playerList = await lobbyUtils.buildPlayerList(updatedLobby, false);
    const owner = await Player.findOne({_id: updatedLobby.owner});

    // oops, was the owner account deleted?
    if (!owner) {
        return socket.emit(events.ERROR, {
            status: false,
            type: "internal_server_error",
            message: error.INTERNAL_SERVER_ERROR
        });
    }

    let Game = null;

    if (updatedLobby.game && updatedLobby.status === game.GameState.PLAYING) {
        Game = game.Game.fromState(updatedLobby.game);
    }

    // send a private message to the socket with the required information
    socket.emit(events.JOINED_GAME, {
        isHost: socket.isAdmin,
        lobby: {
            ...(socket.isAdmin && {
                with2FA: lobby.with2FA,
                passphrase: lobby.passphrase,
            }),
            status: lobby.status,
            players: playerList,
            owner: owner.name,
            name: socket.decoded.name,
        },
        ...((Game !== null) && {game: Game.getStateForPlayer(players[idx].name)})
    });

    // notify all other clients that a new player has joined the lobby...
    if (lobby.status === game.GameState.WAITING) {
        socket.broadcast.emit(events.NEW_PLAYER, {
            lobby: {
                players: playerList,
                owner: owner.name,
            }
        });
    }
}

export default handler;
