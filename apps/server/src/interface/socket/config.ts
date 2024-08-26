import {
    ActionMessageSchema,
    CloseGameMessageSchema,
    ErrorMessageSchema,
    LobbyMessageSchema,
    StateUpdateMessageSchema,
    VictoryMessageSchema,
} from "@durachok/transport/src/request/socket";
import { MessageSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";
import { createSimpleConfig } from "zod-sockets";

import { transformErrorIntoMessage } from "./error";

export const config = createSimpleConfig({
    startupLogo: false,
    security: [
        {
            type: "httpApiKey",
            description: "Server security schema",
            in: "header",
            name: "x-token",
        },
    ],
    emission: {
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
        gameStarted: {
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
         * General state update, player-clients don't need to process
         * this message, its mostly for spectators.
         * */
        state: {
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
        onConnection: async ({ client, logger }) => {
            logger.info("connected", client.id, client.getData());
            client.join("lobby-1");
        },
        onError: async ({ client, error, logger }) => {
            // Log the problem (@@Todo: sentry) and then emit the error
            // to the client.
            logger.error("something went wrong", error);

            if (client) {
                await client.emit("error", transformErrorIntoMessage(error));
            }
        },
        onDisconnect: async ({ client, logger }) => {
            logger.info("disconnected", client.id);
        },
    },
});