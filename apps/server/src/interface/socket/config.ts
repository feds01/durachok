import {
    ActionMessageSchema,
    CloseGameMessageSchema,
    ErrorMessageSchema,
    LobbyMessageSchema,
    PlayerJoinSchema,
    StateUpdateMessageSchema,
    TokensMessageSchema,
    VictoryMessageSchema,
} from "@durachok/transport";
import { MessageSchema } from "@durachok/transport";
import { z } from "zod";
import { createSimpleConfig } from "zod-sockets";

import { UserTokensResponseSchema } from "../../schemas/auth";
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
    emission: {
        /**
         * New tokens for the client, sent when it connects if its tokens had
         * expired, so that it can use them from now on.
         */
        tokens: {
            schema: z.tuple([TokensMessageSchema]),
        },

        /**
         * An event that is emitted to the joining player of the
         * lobby, this is the first message that the player will
         * receive.
         */
        join: {
            schema: z.tuple([PlayerJoinSchema]),
        },
        /**
         * Updates to the lobby state, this can happen when:
         *
         * - Admin has updated the passphrase.
         * - New player joins the lobby.
         * - countdown begins in the lobby.
         * - Game has started.
         * - When a player joins the game (private message).
         */
        lobbyState: {
            schema: z.tuple([LobbyMessageSchema]),
        },

        /** Message to indicate that the game is about start. */
        countdown: {
            schema: z.tuple([]),
        },

        /** Message to indicate that the game started. */
        start: {
            schema: z.tuple([]),
        },

        /** A new message was sent to the lobby. */
        message: {
            schema: z.tuple([MessageSchema]),
        },

        /**
         * When a round of a game finishes, emit a "victory" message, clients
         * should react accordingly.
         */
        victory: {
            schema: z.tuple([VictoryMessageSchema]),
        },

        /**
         * Specify to a client that they should close the connection, its either
         * stale or invalid.
         */
        close: {
            schema: z.tuple([CloseGameMessageSchema]),
        },

        /**
         * When a player has updated their state, this is emitted to all
         * players in the game.
         * */
        playerState: {
            schema: z.tuple([StateUpdateMessageSchema]),
        },

        /**
         * When a player has performed an action, represent this action in the
         * UI.
         *  */
        action: {
            schema: z.tuple([ActionMessageSchema]),
        },

        /**
         * General error message, this is used to send error messages.
         *
         * Errors can be:
         *
         * - Stale game, when a player tries to send moves for a game that's finished.
         * - Invalid move, when a player tries to perform an invalid move.
         * - Invalid session, when a player tries to send a move but their session is invalid,
         *   i.e. an un-authorized action.
         */
        error: {
            schema: z.tuple([ErrorMessageSchema]),
        },
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
        onDisconnect: async ({ client, logger }) => {
            logger.info({ id: client.id }, "disconnected");
        },
    },
});
