import { z } from "zod";
import { ActionsFactory } from "zod-sockets";
import { createSimpleConfig } from "zod-sockets";

const config = createSimpleConfig({
    security: [
        {
            type: "httpApiKey",
            description: "Server security schema",
            in: "header",
            name: "x-token",
        },
    ],
});

const sockets = new ActionsFactory(config);

export const onJoin = sockets.build({
    event: "join",
    input: z.tuple([]).rest(z.object({})),
    handler: async ({ input }) => {
        console.log("onJoin", input);
    },
});

export const onLeave = sockets.build({
    event: "leave",
    input: z.tuple([]).rest(z.object({})),
    handler: async ({ input }) => {
        console.log("leaving", input);
    },
});

export const onKick = sockets.build({
    event: "kick",
    input: z.tuple([]).rest(z.object({})),
    handler: async ({ input }) => {
        console.log("kicking", input);
    },
});

export const onMessage = sockets.build({
    event: "message",
    input: z.tuple([]).rest(z.object({})),
    handler: async ({ input }) => {
        console.log("message", input);
    },
});

export const onPlayerMove = sockets.build({
    event: "move",
    input: z.tuple([]).rest(z.object({})),
    handler: async ({ input }) => {
        console.log("move", input);
    },
});

export const onResign = sockets.build({
    event: "resign",
    input: z.tuple([]).rest(z.object({})),
    handler: async ({ input }) => {
        console.log("resign", input);
    },
});

export const onStart = sockets.build({
    event: "start",
    input: z.tuple([]).rest(z.object({})),
    handler: async ({ input }) => {
        console.log("start", input);
    },
});

export const onPassphraseUpdate = sockets.build({
    event: "passphrase",
    input: z.tuple([]).rest(z.object({})),
    handler: async ({ input }) => {
        console.log("passphrase", input);
    },
});
