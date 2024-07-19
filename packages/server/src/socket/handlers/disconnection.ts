// import Lobby from "../../models/game.model";
// import * as lobbyUtils from "../../utils/lobby";
// import { ClientEvents, GameStatus } from "shared";
// import { Server, Socket } from "socket.io";


// async function handler(context: any, socket: Socket, io?: Server | null) {
//     const meta = { pin: socket.lobby.pin, event: "disconnect" }

//     // if the socket connection is not an admin, we need to remove it from
//     // the player lobby and free up a space.
//     if (!socket.isAdmin) {
//         const lobby = await Lobby.findOne({ pin: socket.lobby.pin });

//         // The lobby might of been deleted...
//         if (lobby === null) return;

//         // Remove the player from the list
//         if (lobby.status === GameStatus.WAITING) {
//             const players = lobby.players;
//             const playerIdx = players.findIndex((player) => player.socketId === socket.id);
//             socket.logger.info("Attempting to remove user from a lobby", meta);

//             // Should not happen but if it does we shouldn't proceed...
//             if (playerIdx < 0) {
//                 socket.logger.warn("User disconnected from lobby, but their id couldn't be found.", meta);
//                 return;
//             }

//             players.splice(playerIdx, 1);

//             // update mongo with new player list and send out update about players
//             const updatedLobby = await Lobby.findOneAndUpdate(
//                 { _id: socket.lobby._id },
//                 { $set: { 'players': players } },
//                 { new: true }
//             );

//             socket.logger.info("Removed user from lobby", { ...meta, name: socket.decoded!.name });

//             // notify all other clients that a new player has joined the lobby...
//             socket.broadcast.emit(ClientEvents.NEW_PLAYER, {
//                 lobby: {
//                     players: lobbyUtils.buildPlayerList(updatedLobby!, false),
//                     owner: socket.lobby.owner.name,
//                 }
//             });
//         }
//     }
// }

// export default handler;
