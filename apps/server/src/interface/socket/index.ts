import { Server as HTTPServer } from "http";
import { Logger } from "pino";
import { Server } from "socket.io";
import { attachSockets } from "zod-sockets";

import { APP_URL } from "../../config";
import logger from "../../lib/logger";
import { actions } from "./actions";
import { config as socketConfig } from "./config";

const io = new Server({
    cors: {
        origin: APP_URL,
        credentials: true,
    },
});

/**
 * Attach the socket server to the HTTP server.
 */
export async function connectSocket(server: HTTPServer) {
    logger.info("Attempting to connect socket server to HTTP server");
    attachSockets({
        io,
        target: server,
        config: socketConfig,
        actions,
        logger,
    });
}

declare module "zod-sockets" {
    interface LoggerOverrides extends Logger {}
}
