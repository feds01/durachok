import { GamePinSchema } from "@durachok/transport";
import { z } from "zod";

import { ensureLobbyAccess } from "../common/auth";
import { factory } from "./ctx";

const onLeave = factory.build({
    event: "leave",
    input: z.tuple([GamePinSchema]),
    handler: async ({ withRooms, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin] = input;
        const meta = { event: "leave", pin, clientId: client.id };

        logger.info(meta, "processing event");
        const { name } = await ensureLobbyAccess(ctx, client, pin);

        // Only possible before the game starts, and not for the owner.
        await ctx.lobbyService.removePlayer(pin, name);
        await client.leave(pin);
        logger.info(meta, "player left");

        await withRooms(pin).broadcast("lobbyState", {
            update: {
                type: "player_exit",
            },
            lobby: await ctx.lobbyService.get(pin),
        });
    },
});

export default onLeave;
