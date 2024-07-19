// import Joi from "joi";
// import { getLobby } from "../getLobby";
// import { ClientEvents, ServerEvents } from "shared";
// import { Server, Socket } from "socket.io";
// import Lobby, { Message } from "../../models/game.model";
// import { RegisteredUserTokenPayload } from "../../types/auth";

// const MessageSchema = Joi.object({
//     message: Joi.string().min(1).max(200).required(),
// });

// async function handler(context: any, socket: Socket, io: Server | null) {
//     const meta = { pin: socket.lobby.pin, event: ServerEvents.MESSAGE };
//     const lobby = await getLobby(socket.lobby.pin);

//     // check if this is an anonymous message...
//     if (socket.decoded && context.message) {
//         socket.logger.info(`${socket.decoded.name} sent a message: "${context.message}"`, meta);
//     } else {
//         socket.logger.info("A spectator user sent a message.", meta)
//     }

//     // ensure that the message passes the schema
//     const result = MessageSchema.validate(context);

//     // Oops the message was invalid and didn't pass the schema test
//     if (result.error) {
//         socket.logger.warn("Received invalid message, aborting processing message", meta);
//         return;
//     }

//     const decoded = socket.decoded as RegisteredUserTokenPayload;

//     const messagePayload = {
//         name: socket.decoded?.name || "Anonymous",
//         time: Date.now() - lobby.createdAt,
//         message: context.message,
//         ...decoded?.id && { owner: decoded.id },
//     } as Message;

//     // save the message into mongo and then broadcast the message to everyone...
//     socket.logger.info("Emitting message event to all clients and saving message to db", meta);

//     await Lobby.updateOne({ _id: socket.lobby._id }, {
//         chat: [...lobby.chat, messagePayload],
//     });

//     io!.of(socket.lobby.pin.toString()).emit(ClientEvents.MESSAGE, messagePayload);
// }

// export default handler;
