import User from "../../models/user";
import {getLobby} from "../getLobby";
import {Server, Socket} from "socket.io";
import Lobby, {Player} from "../../models/game";
import * as lobbyUtils from "../../utils/lobby";
import {buildPlayerList} from "../../utils/lobby";
import {ClientEvents, error, Game, GameStatus, ServerEvents} from "shared";

async function handler(context: any, socket: Socket, io?: Server | null) {
    const meta = {pin: socket.lobby.pin, event: ServerEvents.JOIN_GAME};
    const lobby = await getLobby(socket.lobby.pin);
    socket.lobby = lobby;

    const owner = await User.findOne({_id: lobby.owner});

    // oops, was the owner account deleted?
    if (!owner) {
        socket.logger.error("Couldn't find lobby owner", meta);

        return socket.emit(ClientEvents.ERROR, {
            status: false,
            type: "internal_server_error",
            message: error.INTERNAL_SERVER_ERROR
        });
    }

    if (socket.decoded) {
        socket.logger.info("Processing join event", {...meta, name: socket.decoded.name});
    } else {

        // Don't do anything if the game hasn't started yet
        if (lobby.status === GameStatus.WAITING) return;

        let game = Game.fromState(lobby.game!.state, lobby.game!.history);

        socket.logger.info("Emitting spectator join event", meta);
        socket.emit(ClientEvents.JOINED_GAME, {
            isHost: socket.isAdmin,
            isSpectator: true,
            lobby: {
                ...(socket.isAdmin && {
                    with2FA: lobby.with2FA,
                    passphrase: lobby.passphrase,
                }),
                disableChat: lobby.disableChat,
                chat: lobby.chat,
                roundTimeout: lobby.roundTimeout,
                status: lobby.status,
                players: buildPlayerList(lobby),
                owner: owner.name,
            },
            game: game.getStateForSpectator(),
        });

        return;
    }

    // update the players object for the game with the socket id
    const players = lobby.players;
    const idx = players.findIndex((player) => player.name === socket.decoded!.name);

    // Couldn't find the player by name...
    if (idx < 0) {
        socket.logger.warn("User tried to connect to lobby, but their entry couldn't be found.", meta);
        socket.emit(ClientEvents.CLOSE, {
            "reason": "Invalid session.",

            // tell the client that their token is stale if they aren't
            // a user. We don't want to clear a users token since it can
            // be used to join the game by just using the token.
            ...!socket.isUser && {token: "stale"}
        });
        return socket.disconnect();
    }

    // set socket id and set the player as 'confirmed' for the lobby.
    players[idx] = {
        name: players[idx].name,
        registered: players[idx].registered,
        socketId: socket.id,
        confirmed: true
    } as Player;

    const updatedLobby = await Lobby.findOneAndUpdate(
        {_id: lobby._id},
        {$set: {'players': players}},
        {new: true}
    );

    // If the lobby was deleted, we shouldn't continue
    if (!updatedLobby) {
        socket.logger.warn("Couldn't join player to non existent game.", meta);
        return socket.emit(ClientEvents.ERROR, {error: error.INTERNAL_SERVER_ERROR});
    }

    let playerList = [];
    let i = 0;

    for (let player of lobbyUtils.buildPlayerList(updatedLobby)) {
        let user;

        // check if the player is registered, and has an image profile...
        if (lobby.players.find((p) => p.name === player.name)?.registered) {
            user = await User.findOne({name: player.name});
        }

        playerList[i] = {
            ...player,
            image: user?.image ? process.env.AWS_CLOUDFRONT_URI + user._id + ".jpg" : null,
        };
        i++;
    }

    let state = null;

    if (updatedLobby.game && updatedLobby.status === GameStatus.PLAYING) {
        const game = Game.fromState(updatedLobby.game.state, updatedLobby.game.history);
        state = game.getStateForPlayer(players[idx].name);
    }

    // send a private message to the socket with the required information
    socket.logger.info("Emitting player join event", meta);
    socket.emit(ClientEvents.JOINED_GAME, {
        isHost: socket.isAdmin,
        isSpectator: false,
        lobby: {
            ...(socket.isAdmin && {
                with2FA: lobby.with2FA,
                passphrase: lobby.passphrase,
            }),
            chat: lobby.chat,
            disableChat: lobby.disableChat,
            roundTimeout: lobby.roundTimeout,
            status: lobby.status,
            players: playerList,
            owner: owner.name,
            name: socket.decoded!.name,
        },
        ...((state !== null) && {game: state})
    });

    // notify all other clients that a new player has joined the lobby...
    if (lobby.status === GameStatus.WAITING) {
        socket.broadcast.emit(ClientEvents.NEW_PLAYER, {
            lobby: {
                players: playerList,
                owner: owner.name,
            }
        });
    }
}

export default handler;
