import { Server as HTTPServer } from "http";
import { Logger } from "pino";
import { Server } from "socket.io";
import { attachSockets } from "zod-sockets";

import { APP_URL } from "../../config";
import { Context, createContext } from "../../lib/context";
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

    // Create the context, and prepare it for being passed into
    // the sockets.
    const loggerWithCtx = logger as Logger & {
        ctx: Context;
    };
    loggerWithCtx.ctx = createContext(logger);

    attachSockets({
        io,
        target: server,
        config: socketConfig,
        actions,
        logger: loggerWithCtx,
    });
}

declare module "zod-sockets" {
    interface LoggerOverrides extends Logger {
        /**
         * The context of the current server execution, this is effectively a
         * a dependency injection.
         *
         * @@Hack: this is a massive hack! Discussion: https://github.com/RobinTail/zod-sockets/discussions/272
         */
        ctx: Context;
    }
}
