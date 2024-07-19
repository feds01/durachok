// import jwt from "jsonwebtoken";
// import * as http from "http";
// import "../types/gameSocket";
// import Lobby from "../models/game.model";
// import User from "../models/user.model";
// import logger from "../lib/logger";
// import { refreshTokens } from "../authentication";
// import ServerError from "../errors/ServerError";
// import { SocketQuery } from "../types/gameSocket";
// import SocketIO, { Server, Socket } from "socket.io";
// import { error, GameStatus, ServerEvents } from "shared";
// import { AnonymousUserTokenPayload, RegisteredUserTokenPayload, Token } from "../types/auth";


// import joinGameHandler from "./handlers/join";
// import startGameHandler from "./handlers/startGame";
// import resignPlayerHandler from "./handlers/resign";
// import kickPlayerHandler from "./handlers/kickPlayer";
// import playerMoveHandler from "./handlers/playerMove";
// import playerMessageHandler from "./handlers/message";
// import disconnectionHandler from "./handlers/disconnection";
// import updatePassphraseHandler from "./handlers/updatePassphrase";
// import { getLobby } from "./getLobby";

// let io: Server | null = null;

// /**
//  * Method to emit an event to some lobby with any active connections on it.
//  *
//  * @param {string} pin - The pin of the lobby to emit the event to.
//  * @param {string} name - The name of the event.
//  * @param {Object} message - The event to emit.
//  */
// export function emitLobbyEvent(pin: string, name: string, message: any) {
//     if (io === null) {
//         throw new ServerError("Socket Server not initialised.");
//     }

//     if (!pin.match(/^\d{6}$/g)) {
//         throw new Error("Lobby pin doesn't match format.");
//     }

//     io.of(`/${pin}`).emit(name, message);
// }

// export const makeSocketServer = (server: http.Server) => {
//     io = new Server(server, {});
//     const lobbies: SocketIO.Namespace = io.of(/^\/\d{6}$/);

//     /**
//      * Middleware function to check that the attempted lobby join exists.
//      * */
//     lobbies.use(async (socket: Socket, next: (err?: any) => any) => {
//         const lobbyPin = socket.nsp.name.split("/")[1];

//         // check that a game exists with the provided pin
//         try {
//             const lobby = await getLobby(lobbyPin);
//             socket.lobby = lobby;
//             socket.logger = logger;
//         } catch (e: unknown) {
//             return next(new Error(error.NON_EXISTENT_LOBBY));
//         }

//         next();
//     });

//     lobbies.use((socket: Socket, next) => {
//         const meta = { pin: socket.lobby.pin, event: "init" };
//         const query = socket.handshake.auth as SocketQuery;

//         // apply default parameters to the connection just in case we don;t get the chance to set them
//         socket.isAdmin = false;
//         socket.isUser = false;

//         if (query?.token) {
//             jwt.verify(query.token, process.env.JWT_SECRET_KEY!, async (err, decoded) => {

//                 // Attempt to verify if the user sent a refreshToken
//                 if (err) {
//                     logger.warn("User token expired, attempting to refresh it...", meta);

//                     if (!query.refreshToken) {
//                         return next(new Error(error.AUTHENTICATION_FAILED));
//                     }

//                     // If the refreshToken fails we can't be sure if this is a valid request or an expired
//                     // one, therefore we should just prevent the handshake from succeeding.
//                     try {
//                         const newTokens = await refreshTokens(query.refreshToken);

//                         // emit a 'token' event so that the client can update their copy of the token, refreshTokens
//                         const err = new Error("token");
//                         // @ts-ignore
//                         err.data = newTokens; // additional details

//                         logger.info("Sending refreshed user tokens", meta);
//                         return next(err);
//                     } catch (e) {
//                         logger.warn("Couldn't refresh user token expired", meta);
//                         return next(new Error(error.AUTHENTICATION_FAILED));
//                     }
//                 }

//                 // check that the nsp matched the pin or the user of the Durachok
//                 // service is the owner of this lobby.
//                 const isUser = typeof (decoded as Token<RegisteredUserTokenPayload>)?.data.id !== "undefined";
//                 let isAdmin = false;

//                 if (isUser) {
//                     const user = await User.findOne({ _id: (decoded as Token<RegisteredUserTokenPayload>).data.id });

//                     // This shouldn't happen unless the user was deleted and the token is stale.
//                     if (!user) {
//                         return next(new Error(error.AUTHENTICATION_FAILED));
//                     }

//                     // Verify that the user is allowed to enter the game
//                     const registeredPlayers = socket.lobby.players.filter(p => p.registered).map(p => p.name);

//                     if (!registeredPlayers.includes(user.name)) {
//                         if (socket.lobby.status === GameStatus.WAITING) {
//                             return next(new Error(error.AUTHENTICATION_FAILED));
//                         }

//                         return;
//                     }

//                     // Check if this is the admin/owner user.
//                     if (user.id.toString() === socket.lobby.owner.id.toString()) {
//                         isAdmin = true;
//                     }
//                 } else if (socket.lobby.pin !== (decoded as Token<AnonymousUserTokenPayload>).data.pin) {

//                     // if we're currently waiting for a game to start, we shouldn't allow anonymous connections or
//                     // as we consider it to be spectators.
//                     if (socket.lobby.status === GameStatus.WAITING) {
//                         const err = new Error(error.AUTHENTICATION_FAILED);
//                         return next(err);
//                     }

//                     return;
//                 }

//                 socket.isUser = isUser;
//                 socket.isAdmin = isAdmin;

//                 // Improve this!
//                 if (isUser) {
//                     socket.decoded = (decoded as Token<RegisteredUserTokenPayload>).data;
//                 } else {
//                     socket.decoded = (decoded as Token<AnonymousUserTokenPayload>).data;
//                 }

//                 // check here if the user is already within the game that they are trying to access, if so we'll
//                 // auto update their socket id to avoid connectivity problems...
//                 if (socket.lobby.status === GameStatus.PLAYING) {
//                     const entry = socket.lobby.players.findIndex((player) => player.name === socket.decoded!.name);

//                     if (entry > -1 && socket.lobby.players[entry]!.socketId !== socket.id) {

//                         logger.warn("fixing stale socket connection", meta);
//                         const players = socket.lobby.players;
//                         players[entry].socketId = socket.id;

//                         await Lobby.updateOne({ _id: socket.lobby._id },
//                             { $set: { players } }
//                         );
//                     }
//                 }

//                 return next();
//             });
//         } else if (socket.lobby.status === GameStatus.WAITING) {
//             const err = new Error(error.AUTHENTICATION_FAILED);
//             return next(err);
//         }
//     });

//     lobbies.on('connect', (socket: Socket) => {
//         socket.on("disconnecting", async (context: any) => await disconnectionHandler(context, socket, io));

//         socket.on(ServerEvents.JOIN_GAME, async (context: any) => await joinGameHandler(context, socket, io));
//         socket.on(ServerEvents.UPDATE_PASSPHRASE, async (context: any) => await updatePassphraseHandler(context, socket, io));
//         socket.on(ServerEvents.START_GAME, async (context: any) => await startGameHandler(context, socket, io));
//         socket.on(ServerEvents.MESSAGE, async (context: any) => await playerMessageHandler(context, socket, io));
//         socket.on(ServerEvents.SURRENDER, async (context: any) => await resignPlayerHandler(context, socket, io));
//         socket.on(ServerEvents.KICK_PLAYER, async (context: any) => await kickPlayerHandler(context, socket, io));
//         socket.on(ServerEvents.MOVE, async (context: any) => await playerMoveHandler(context, socket, io));

//         // Do we even need this?
//         socket.on("error", (context: any) => {
//             logger.error(`Error occurred when handling an event: ${context}`, { pin: socket.lobby.pin, event: "init" });
//         });
//     });
// }
