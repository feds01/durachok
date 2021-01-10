import {Server} from "socket.io";
import Lobby from "../models/game";
import {error, events} from "shared";
import jwt from "jsonwebtoken";
import {refreshTokens} from "../authentication";
import Player from "../models/user";

import joinGameHandler from "./handlers/join";
import startGameHandler from "./handlers/startGame";
import kickPlayerHandler from "./handlers/kickPlayer";
import playerMoveHandler from "./handlers/playerMove";
import nextRoundActionHandler from "./handlers/nextRound";
import disconnectionHandler from "./handlers/disconnection";
import updatePassphraseHandler from "./handlers/updatePassphrase";

export const makeSocketServer = (server) => {
    const io = new Server(server, {});
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
                const isAdmin = typeof decoded?.data.id !== "undefined";

                if (isAdmin) {
                    const user = await Player.findOne({_id: decoded.data.id});

                    // This shouldn't happen unless the user was deleted and the token is stale.
                    if (!user) {
                        console.log("couldn't find player");
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }

                    // check that id of the owner is equal to the id in the JWT
                    if (user._id.toString() !== socket.lobby.owner._id.toString()) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }
                }

                if (!isAdmin && socket.lobby.pin !== decoded.data.pin) {
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
        socket.on(events.NEXT_ROUND, async (context) => await nextRoundActionHandler(context, socket, io));
    });
}
