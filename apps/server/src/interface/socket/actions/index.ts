import { PlayerMoveSchema } from "@durachok/transport/src/schemas/game";
import {
    GamePassPhraseSchema,
    GamePinSchema,
} from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";
import { ActionsFactory } from "zod-sockets";

import { config } from "../config";

const factory = new ActionsFactory(config);

const onJoin = factory.build({
    event: "join",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input }) => {
        console.log("onJoin", input);
    },
});

const onLeave = factory.build({
    event: "leave",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input }) => {
        console.log("leaving", input);
    },
});

const onKick = factory.build({
    event: "kick",
    input: z.tuple([GamePinSchema, z.object({ id: z.string() })]),
    handler: async ({ input }) => {
        console.log("kicking", input);
    },
});

const onMessage = factory.build({
    event: "message",
    input: z.tuple([GamePinSchema, z.object({ message: z.string() })]),
    handler: async ({ input }) => {
        console.log("message", input);
    },
});

const onPlayerMove = factory.build({
    event: "move",
    input: z.tuple([GamePinSchema, PlayerMoveSchema]),
    handler: async ({ input }) => {
        console.log("move", input);
    },
});

const onResign = factory.build({
    event: "resign",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input }) => {
        console.log("resign", input);
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
    handler: async ({ input }) => {
        console.log("passphrase", input);
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
