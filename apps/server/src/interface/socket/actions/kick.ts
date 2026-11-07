import { GamePinSchema, UserNameSchema } from "@durachok/transport";
import { z } from "zod";

import { ensureOwnerAccess } from "../common/auth";
import { factory } from "./ctx";

const onKick = factory.build({
    event: "kick",
    /** The player to kick, by their name in the lobby. */
    input: z.tuple([GamePinSchema, z.object({ name: UserNameSchema })]),
    handler: async ({ withRooms, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin, { name }] = input;
        const meta = { event: "kick", pin, clientId: client.id, name };

        logger.info(meta, "processing event");
        await ensureOwnerAccess(ctx, client, pin);

        // Only possible before the game starts, and not for the owner.
        const player = await ctx.lobbyService.removePlayer(pin, name);
        logger.info(meta, "player kicked");

        // Tell the kicked player, and take their connection out of the lobby.
        const clients = await withRooms(pin).getClients();
        const kicked = clients.find((c) => c.id === player.socket);
        if (kicked) {
            await kicked.emit("close", { reason: "kicked" });
            await kicked.leave(pin);
        }

        await withRooms(pin).broadcast("lobbyState", {
            update: {
                type: "player_exit",
            },
            lobby: await ctx.lobbyService.get(pin),
        });
    },
});

export default onKick;
