import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { assert, isDef } from "../../../utils";
import { ensureLobbyAccess } from "../common/auth";
import { factory } from "./ctx";

const onMessage = factory.build({
    event: "message",
    input: z.tuple([GamePinSchema, z.object({ message: z.string() })]),
    handler: async ({ all, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [[pin], { message }] = input;
        const meta = { event: "message", pin, clientId: client.id };

        logger.info(meta, "processing event");
        await ensureLobbyAccess(ctx, client, pin);

        const payload = await ctx.lobbyService.sendMessage(
            pin,
            client.id,
            message,
        );

        const clients = await all.getClients();
        const players = await ctx.lobbyService.getPlayers(pin);
        assert(isDef(players));

        players
            .filter((p) => p.socket)
            .forEach((p) => {
                // @@Slowness: we need to loop through all of the clients to find
                // the specific client, ideally we should be able to get just the
                // client directly by id?
                clients
                    .find((c) => c.id === p.socket)
                    ?.emit("message", payload);
            });
    },
});

export default onMessage;
