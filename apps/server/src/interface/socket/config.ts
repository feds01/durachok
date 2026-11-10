import { ServerEvents } from "@durachok/transport";
import { z } from "zod";
import { createSimpleConfig } from "zod-sockets";

import { UserTokensResponseSchema } from "../../schemas/auth";
import { context } from "./context";
import { transformErrorIntoMessage } from "./error";

export const config = createSimpleConfig({
    startupLogo: false,
    security: [
        {
            type: "apiKey",
            description: "The access and refresh tokens, sent as `token` and `refreshToken` in the handshake's `auth`",
            in: "user",
        },
    ],
    /** What the connection middleware learnt about the client, @see connectSocket. */
    metadata: z.object({
        /** The client's verified tokens and their payload. */
        auth: UserTokensResponseSchema,
        /** Whether the client's tokens had expired, and new ones were created. */
        refreshed: z.boolean(),
    }),
    /** What the server sends a client, @see ServerEvents. */
    emission: {
        tokens: { schema: ServerEvents.tokens },
        join: { schema: ServerEvents.join },
        lobbyState: { schema: ServerEvents.lobbyState },
        countdown: { schema: ServerEvents.countdown },
        start: { schema: ServerEvents.start },
        message: { schema: ServerEvents.message },
        victory: { schema: ServerEvents.victory },
        close: { schema: ServerEvents.close },
        playerState: { schema: ServerEvents.playerState },
        action: { schema: ServerEvents.action },
        error: { schema: ServerEvents.error },
    },
    hooks: {
        /**
         * The connection middleware has already authenticated the client, @see connectSocket.
         * If it had to refresh the client's tokens, hand the new ones back to it.
         */
        onConnection: async ({ client, logger }) => {
            const { auth, refreshed } = client.getData();
            logger.info({ id: client.id, kind: auth?.payload.kind }, "connected");

            if (refreshed && auth?.rawTokens.refreshToken) {
                await client.emit("tokens", {
                    token: auth.rawTokens.token,
                    refreshToken: auth.rawTokens.refreshToken,
                });
            }
        },
        onError: async ({ client, error, logger }) => {
            // Log the problem (@@Todo: sentry) and then emit the error
            // to the client.
            logger.error(error, "something went wrong");

            if (client) {
                await client.emit("error", transformErrorIntoMessage(error));
            }
        },
        /**
         * A player who leaves a waiting lobby gives up their place in it, but a
         * player in a game, or the owner, keeps theirs, so that they can rejoin.
         */
        onDisconnect: async ({ client, withRooms, logger }) => {
            logger.info({ id: client.id }, "disconnected");

            const pin = await context.lobbyService.disconnect(client.id);
            if (pin) {
                await withRooms(pin).broadcast("lobbyState", {
                    update: { type: "player_exit" },
                    lobby: await context.lobbyService.get(pin),
                });
            }
        },
    },
});
