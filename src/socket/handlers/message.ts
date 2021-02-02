import {Server, Socket} from "socket.io";
import {getLobby} from "../getLobby";
import {ServerEvents} from "shared";

async function handler(context: any, socket: Socket, io?: Server | null) {
    const meta = {pin: socket.lobby.pin, event: ServerEvents.MESSAGE};
    const lobby = await getLobby(socket.lobby.pin);

    // find the player in the database record by the socket id...
    const {name} = socket.decoded;
    const player = lobby.players.find((p) => p.name === name);

    if (!player) return;

    socket.logger.info(`${player.name} sent a message: ${context.message}`, meta);
}

export default handler;
