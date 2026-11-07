import { Server as HTTPServer } from "http";
import { Logger } from "pino";
import { Server } from "socket.io";
import { attachSockets } from "zod-sockets";

import { WEB_ORIGINS } from "../../config";
import { authenticate } from "../../lib/authentication";
import { Context, createContext } from "../../lib/context";
import logger from "../../lib/logger";
import { actions } from "./actions";
import { config as socketConfig } from "./config";

const io = new Server({
    cors: {
        origin: WEB_ORIGINS,
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

    // Authenticate every connection before it reaches the handlers. Clients send
    // their tokens in the handshake's `auth`, or, as the API takes them, in the
    // `x-token` and `x-refresh-token` headers. A rejected client receives a
    // `connect_error` with the message "unauthorized".
    io.use(async (socket, next) => {
        const { auth, headers } = socket.handshake;
        const result = await authenticate(
            loggerWithCtx.ctx.authService,
            auth.token ?? headers["x-token"],
            auth.refreshToken ?? headers["x-refresh-token"],
        );

        if (!result) {
            logger.info({ id: socket.id }, "rejected unauthorised connection");
            return next(new Error("unauthorized"));
        }

        socket.data = { auth: result.tokens, refreshed: result.refreshed };
        next();
    });

    await attachSockets({
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
