import { PlayerMoveSchema } from "@durachok/transport/src/schemas/game";
import {
    GamePassPhraseSchema,
    GamePinSchema,
} from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";
import { ActionsFactory, ClientContext, EmissionMap } from "zod-sockets";

import { ensurePayloadIsTokens } from "../../../lib/authentication";
import { UserTokensResponse } from "../../../schemas/auth";
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
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("join", client.id);

        const auth = ensureAuth(client);
        logger.info("joining", input, auth);
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
