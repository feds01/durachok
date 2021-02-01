import jwt from "jsonwebtoken";
import * as http from "http";
import "../types/gameSocket";
import Lobby from "../models/game";
import User from "../models/user";
import {error, ServerEvents} from "shared";
import {refreshTokens} from "../authentication";
import ServerError from "../errors/ServerError";
import {SocketQuery} from "../types/gameSocket";
import SocketIO, {Server, Socket} from "socket.io";
import {AnonymousUserTokenPayload, Token, RegisteredUserTokenPayload} from "../types/auth";

import joinGameHandler from "./handlers/join";
import startGameHandler from "./handlers/startGame";
import resignPlayerHandler from "./handlers/resign";
import kickPlayerHandler from "./handlers/kickPlayer";
import playerMoveHandler from "./handlers/playerMove";
import disconnectionHandler from "./handlers/disconnection";
import updatePassphraseHandler from "./handlers/updatePassphrase";

let io: Server | null = null;

/**
 * Method to emit an event to some lobby with any active connections on it.
 *
 * @param {string} pin - The pin of the lobby to emit the event to.
 * @param {string} name - The name of the event.
 * @param {Object} message - The event to emit.
 */
export function emitLobbyEvent(pin: string, name: string, message: any) {
    if (io === null) {
        throw new ServerError("Socket Server not initialised.");
    }

    if (!pin.match(/^\d{6}$/g)) {
        throw new Error("Lobby pin doesn't match format.");
    }

    io.of(`/${pin}`).emit(name, message);
}

export const makeSocketServer = (server: http.Server) => {
    io = new Server(server, {});
    const lobbies: SocketIO.Namespace = io.of(/^\/\d{6}$/);

    /**
     * Middleware function to check that the attempted lobby join exists.
     * */
    lobbies.use(async (socket: Socket, next: (err?: any) => any) => {
        const lobbyPin = socket.nsp.name.split("/")[1];

        // check that a game exists with the provided pin
        const lobby = await Lobby.findOne({pin: lobbyPin});

        if (!lobby) {
            return next(new Error(error.NON_EXISTENT_LOBBY));
        }

        socket.lobby = lobby;
        next();
    });

    lobbies.use((socket: Socket, next) => {
        const query = socket.handshake.auth as SocketQuery;

        if (query?.token) {
            jwt.verify(query.token, process.env.JWT_SECRET_KEY!, async (err, decoded) => {

                // Attempt to verify if the user sent a refreshToken
                if (err) {
                    console.log(err);
                    if (!query.refreshToken) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }

                    // If the refreshToken fails we can't be sure if this is a valid request or an expired
                    // one, therefore we should just prevent the handshake from succeeding.
                    try {
                        const newTokens = await refreshTokens(query.refreshToken);

                        // emit a 'token' event so that the client can update their copy of the token, refreshTokens
                        // TODO: move 'token' event name into shared/events
                        const err = new Error("token");
                        // @ts-ignore
                        err.data = newTokens; // additional details

                        return next(err);
                    } catch (e) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }
                }

                // check that the nsp matched the pin or the user of the Durachok
                // service is the owner of this lobby.
                const isUser = typeof (decoded as Token<RegisteredUserTokenPayload>)?.data.id !== "undefined";
                let isAdmin = false;

                if (isUser) {
                    const user = await User.findOne({_id: (decoded as Token<RegisteredUserTokenPayload>).data.id});

                    // This shouldn't happen unless the user was deleted and the token is stale.
                    if (!user) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }

                    // Verify that the user is allowed to enter the game
                    const registeredPlayers = socket.lobby.players.filter(p => p.registered).map(p => p.name);

                    if (!registeredPlayers.includes(user.name)) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }

                    // Check if this is the admin/owner user.
                    if (user._id.toString() === socket.lobby.owner._id.toString()) {
                        isAdmin = true;
                    }
                } else if (socket.lobby.pin !== (decoded as Token<AnonymousUserTokenPayload>).data.pin) {
                    // inform that the user should discard this token
                    const err = new Error(error.AUTHENTICATION_FAILED);

                    // @ts-ignore
                    err.data = {"token": "stale"};

                    return next(err);
                }

                socket.isUser = isUser;
                socket.isAdmin = isAdmin;

                // Improve this!
                if (isUser) {
                    socket.decoded = (decoded as Token<RegisteredUserTokenPayload>).data;
                } else {
                    socket.decoded = (decoded as Token<AnonymousUserTokenPayload>).data;
                }

                return next();
            });
        } else {
            const err = new Error(error.AUTHENTICATION_FAILED);
            return next(err);
        }
    });

    lobbies.on('connect', (socket: Socket) => {
        socket.on("disconnecting", async (context: any) => await disconnectionHandler(context, socket, io));

        socket.on(ServerEvents.JOIN_GAME, async (context: any) => await joinGameHandler(context, socket, io));
        socket.on(ServerEvents.UPDATE_PASSPHRASE, async (context: any) => await updatePassphraseHandler(context, socket, io));
        socket.on(ServerEvents.START_GAME, async (context: any) => await startGameHandler(context, socket, io));
        socket.on(ServerEvents.SURRENDER, async (context: any) => await resignPlayerHandler(context, socket, io));
        socket.on(ServerEvents.KICK_PLAYER, async (context: any) => await kickPlayerHandler(context, socket, io));
        socket.on(ServerEvents.MOVE, async (context: any) => await playerMoveHandler(context, socket, io));

        socket.on("error", (context: any) => {
            console.log(context);
        });
    });
}
