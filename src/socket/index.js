import jwt from "jsonwebtoken";
import {Server} from "socket.io";
import Lobby from "../models/game";
import {error, events} from "shared";
import Player from "../models/user";
import * as lobbyUtils from "../utils/lobby";
import {refreshTokens} from "../authentication";

import joinGameHandler from "./handlers/join";
import startGameHandler from "./handlers/startGame";
import kickPlayerHandler from "./handlers/kickPlayer";
import playerMoveHandler from "./handlers/playerMove";
import disconnectionHandler from "./handlers/disconnection";
import updatePassphraseHandler from "./handlers/updatePassphrase";
import ServerError from "../errors/ServerError";

let io = null;

/**
 * Method to emit an event to some lobby with any active connections on it.
 *
 * @param {string} pin - The pin of the lobby to emit the event to.
 * @param {string} name - The name of the event.
 * @param {Object} message - The event to emit.
 */
export function emitLobbyEvent(pin, name, message) {
    if (io === null) {
        throw new ServerError("Socket Server not initialised.");
    }

    if (!pin.match(/^\d{6}$/g)) {
        throw new Error("Lobby pin doesn't match format.");
    }

    io.of(`/${pin}`).emit(name, message);
}

export const makeSocketServer = (server) => {
    io = new Server(server, {});
    const lobbies = io.of(/^\/\d{6}$/);

    /**
     * Middleware function to check that the attempted lobby join exists.
     * */
    lobbies.use(async (socket, next) => {
        const lobbyPin = socket.nsp.name.split("/")[1];

        // check that a game exists with the provided pin
        const lobby = await Lobby.findOne({pin: lobbyPin});

        if (!lobby) {
            return next(new Error(error.NON_EXISTENT_LOBBY));
        }

        socket.lobby = lobby;
        next();
    });

    lobbies.use((socket, next) => {
        if (socket.handshake.query && socket.handshake.query.token) {
            jwt.verify(socket.handshake.query.token, process.env.JWT_SECRET_KEY, async (err, decoded) => {

                // Attempt to verify if the user sent a refreshToken
                if (err) {
                    if (!socket.handshake.query.refreshToken) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }

                    // If the refreshToken fails we can't be sure if this is a valid request or an expired
                    // one, therefore we should just prevent the handshake from succeeding.
                    try {
                        const newTokens = await refreshTokens(socket.handshake.query.refreshToken);

                        // emit a 'token' event so that the client can update their copy of the token, refreshTokens
                        // TODO: move 'token' event name into shared/events
                        const err = new Error("token");
                        err.data = newTokens; // additional details

                        return next(err);
                    } catch (e) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }
                }

                // check that the nsp matched the pin or the user of the Durachok
                // service is the owner of this lobby.
                const isUser = typeof decoded?.data.id !== "undefined";
                let isAdmin = false;

                if (isUser) {
                    const user = await Player.findOne({_id: decoded.data.id});

                    // This shouldn't happen unless the user was deleted and the token is stale.
                    if (!user) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }

                    // Verify that the user is allowed to enter the game
                    const registeredPlayers = lobbyUtils.buildPlayerList(socket.lobby)
                                                .filter(p => p.registered)
                                                .map(p => p.name);

                    if (!registeredPlayers.includes(user.name)) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }

                    // Check if this is the admin/owner user.
                    if (user._id.toString() === socket.lobby.owner._id.toString()) {
                        isAdmin = true;
                    }
                } else if (socket.lobby.pin !== decoded.data.pin) {
                    return next(new Error(error.AUTHENTICATION_FAILED));
                }

                socket.isAdmin = isAdmin;
                socket.decoded = decoded.data;
                next();
            });
        } else {
            next(new Error(error.AUTHENTICATION_FAILED));
        }
    });

    lobbies.on('connect', (socket) => {
        socket.on("disconnecting", async (context) => await disconnectionHandler(context, socket, io));

        socket.on(events.JOIN_GAME, async (context) => await joinGameHandler(context, socket, io));
        socket.on(events.UPDATE_PASSPHRASE, async (context) => await updatePassphraseHandler(context, socket, io));
        socket.on(events.START_GAME, async (context) => await startGameHandler(context, socket, io));
        socket.on(events.KICK_PLAYER, async (context) => await kickPlayerHandler(context, socket, io));
        socket.on(events.MOVE, async (context) => await playerMoveHandler(context, socket, io));
    });
}
