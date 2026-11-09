import { Server as HTTPServer } from "http";
import { Logger } from "pino";
import { attachSockets } from "zod-sockets";

import { authenticate } from "../authentication";
import { limits } from "../../lib/limits";
import logger from "../../lib/logger";
import { RateLimiter } from "../../lib/rate-limit";
import { holderOf } from "../../schemas/auth";
import { actions } from "./actions";
import { Rooms } from "./actions/ctx";
import { config as socketConfig } from "./config";
import { context } from "./context";
import { io } from "./io";

/** How often a client that sends too much is told to slow down, rather than for each event that it floods. */
const slowDowns = new RateLimiter(1, 5000);

/** Emits to the clients outside of a handler, once the sockets are attached. */
let rootContext: { withRooms: Rooms } | undefined;

/**
 * Attach the socket server to the HTTP server.
 */
export async function connectSocket(server: HTTPServer) {
    logger.info("Attempting to connect socket server to HTTP server");

    // Authenticate every connection before it reaches the handlers. Clients send
    // their tokens in the handshake's `auth`, or, as the API takes them, in the
    // `x-token` and `x-refresh-token` headers. A rejected client receives a
    // `connect_error` with the message "unauthorized".
    io.use(async (socket, next) => {
        const { auth, headers } = socket.handshake;
        const result = await authenticate(
            context.authService,
            auth.token ?? headers["x-token"],
            auth.refreshToken ?? headers["x-refresh-token"],
        );

        if (!result) {
            logger.info({ id: socket.id }, "rejected unauthorised connection");
            return next(new Error("unauthorized"));
        }

        socket.data = { auth: result.tokens, refreshed: result.refreshed };

        // A player sends only so many events, over all of their connections, and the ones over
        // the limit are dropped, so that a client can't flood the server, @see limits.
        const holder = holderOf(result.tokens.payload);
        socket.use((_event, nextEvent) => {
            if (limits.events.take(holder)) {
                return nextEvent();
            }
            if (slowDowns.take(holder)) {
                socket.emit("error", { type: "too_many_requests", message: "Too many requests, slow down" });
            }
        });

        next();
    });

    const contexts = await attachSockets({
        io,
        target: server,
        config: socketConfig,
        actions,
        logger,
    });
    rootContext = contexts["/"];
}

/** Tell the clients in a lobby that it was deleted, and take them out of its room. */
export async function notifyLobbyClosed(pin: string): Promise<void> {
    if (!rootContext) {
        return;
    }

    await rootContext.withRooms(pin).broadcast("close", { reason: "lobby_closed" });
    for (const client of await rootContext.withRooms(pin).getClients()) {
        await client.leave(pin);
    }
}

/** The logger that zod-sockets hands the handlers, which is the server's. */
declare module "zod-sockets" {
    interface LoggerOverrides extends Logger {}
}
