// import Lobby from "../../models/game.model";
// import { error, ClientEvents, ServerEvents } from "shared";
// import { Server, Socket } from "socket.io";

// async function handler(context: any, socket: Socket, io?: Server | null) {
//     if (!socket.isAdmin) socket.emit(ClientEvents.ERROR, new Error(error.UNAUTHORIZED));

//     const meta = { pin: socket.lobby.pin, event: ServerEvents.UPDATE_PASSPHRASE };

//     socket.logger.info("Attempting to update lobby passphrase", { ...meta, context });

//     // Don't do anything if 2fa isn't enabled on the lobby.
//     if (!socket.lobby.with2FA) return;

//     // update the passphrase in the MongoDB with the one the client said
//     try {
//         await Lobby.updateOne({ _id: socket.lobby._id }, { passphrase: context.passphrase });

//         // @cleanup: this might be redundant since the server will return an error if it doesn't
//         // manage to update the passphrase.
//         socket.emit(ClientEvents.UPDATED_PASSPHRASE, { passphrase: context.passphrase });
//         socket.logger.info(`Updated passphrase`, meta);
//     } catch (e: unknown) {
//         if (e instanceof Error) {
//             socket.logger.error(`Failed to update passphrase: ${e.message}`, meta);
//         }

//         socket.emit(ClientEvents.ERROR, new Error(error.INTERNAL_SERVER_ERROR));
//     }
// }

// export default handler;
