import { Server } from "socket.io";

import { WEB_ORIGINS } from "../../config";

/** The socket server, which zod-sockets attaches the handlers to. */
export const io = new Server({
    cors: {
        origin: WEB_ORIGINS,
        credentials: true,
    },
    // What a client sends is small: a pin, a move, a message, the settings.
    maxHttpBufferSize: 16 * 1024,
});

/**
 * Close a client's connection, which zod-sockets' clients can't do. The client receives what was
 * sent to it before, and then a disconnect from the server, after which it doesn't reconnect.
 */
export function disconnectClient(id: string): void {
    io.in(id).disconnectSockets();
}
