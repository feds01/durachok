import { PlayerMoveSchema } from "@durachok/transport/src/schemas/game";
import {
    GamePassPhraseSchema,
    GamePinSchema,
} from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";
import { ActionsFactory, ClientContext, EmissionMap } from "zod-sockets";

import { ensurePayloadIsTokens } from "../../../lib/authentication";
import { UserTokensResponse } from "../../../schemas/auth";
import { expr } from "../../../utils";
import { ApiError } from "../../../utils/error";
import { config } from "../config";

const factory = new ActionsFactory(config);

type Client = ClientContext<EmissionMap, z.AnyZodObject>["client"];

function ensureAuth(client: Client): UserTokensResponse {
    const auth = ensurePayloadIsTokens(client.handshake.auth);
    if (!auth) {
        throw ApiError.http(401, "Invalid token");
    }

    return auth;
}

const onJoin = factory.build({
    event: "join",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, all, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        logger.info("join", client.id);

        const [pin] = input;

        // @@Todo: support spectators, if we the game allows for spectators, and
        // if the game is currently in progress, we can send the specific connection
        // the spectator version of the game.

        const auth = ensureAuth(client);

        // we need to check that the user has permission to access this room.
        // if they don't, we should return an error.
        const hasAccess = ctx.lobbyService.hasAccess(auth.payload, pin);
        if (!hasAccess) {
            throw ApiError.http(401, "Unauthorized");
        }

        const name = expr(() => {
            if (auth.payload.kind === "registered") {
                return auth.payload.user.name;
            } else {
                return auth.payload.name;
            }
        });
        logger.info("user joining lobby", name, pin);

        try {
            await ctx.lobbyService.confirmUser(pin, name, client.id);
        } catch (e) {
            logger.warn(
                "User tried to connect to lobby, but their entry couldn't be found.",
                pin,
                name,
            );
            client.emit("close", {
                reason: "stale_token",
            });
            return;
        }

        const lobby = await ctx.lobbyService.getByPin(pin);
        if (!lobby) {
            client.emit("close", {
                reason: "stale_game",
            });
            return;
        }

        // Emit to the current player, the game state.
        const game = ctx.gameService(lobby).getGameStateFor(name);
        client.emit("join", {
            lobby,
            game,
        });

        // We need to send messages to all of the players that are in this
        // lobby, we send to all players with sockets.
        const clients = await all.getClients();

        lobby.players
            .filter((p) => p.socket)
            .forEach((p) => {
                // @@Slowness: we need to loop through all of the clients to find
                // the specific client, ideally we should be able to get just the
                // client directly by id?
                clients
                    .find((c) => c.id === p.socket)
                    ?.emit("lobbyState", {
                        update: {
                            type: "new_player",
                        },
                    });
            });
    },
});

const onLeave = factory.build({
    event: "leave",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("leave", client.id);

        const auth = ensureAuth(client);
        logger.info("leaving", input, auth);
    },
});

const onKick = factory.build({
    event: "kick",
    input: z.tuple([GamePinSchema, z.object({ id: z.string() })]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("kick", client.id);

        const auth = ensureAuth(client);
        logger.info("kicked", input, auth);
    },
});

const onMessage = factory.build({
    event: "message",
    input: z.tuple([GamePinSchema, z.object({ message: z.string() })]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("message", client.id);

        const auth = ensureAuth(client);
        logger.info("messaged", input, auth);
    },
});

const onPlayerMove = factory.build({
    event: "move",
    input: z.tuple([GamePinSchema, PlayerMoveSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("move", client.id);

        const auth = ensureAuth(client);
        logger.info("moved", input, auth);
    },
});

const onResign = factory.build({
    event: "resign",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("resign", client.id);

        const auth = ensureAuth(client);
        logger.info("resigning", input, auth);
    },
});

const onStart = factory.build({
    event: "start",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input }) => {
        console.log("start", input);
    },
});

const onPassphraseUpdate = factory.build({
    event: "passphrase",
    input: z.tuple([GamePinSchema, GamePassPhraseSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("passphrase", client.id);

        const auth = ensureAuth(client);
        logger.info("passphrase changed", input, auth);
    },
});

/** Export all of the actions. */
export const actions = [
    onJoin,
    onLeave,
    onKick,
    onMessage,
    onPlayerMove,
    onResign,
    onStart,
    onPassphraseUpdate,
];
