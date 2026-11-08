import { ClientEvents } from "@durachok/transport";

import { clientsOf, ensureOwnerAccess } from "../common/auth";
import { factory } from "./ctx";

const onKick = factory.build({
    event: "kick",
    /** The player to kick, by their name in the lobby. */
    input: ClientEvents.kick,
    handler: async ({ withRooms, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin, { name }] = input;
        const meta = { event: "kick", pin, clientId: client.id, name };

        logger.info(meta, "processing event");
        await ensureOwnerAccess(ctx, client, pin);

        // Only possible before the game starts, and not for the owner. They can't join again.
        const player = await ctx.lobbyService.removePlayer(pin, name, { kick: true });
        logger.info(meta, "player kicked");

        // Tell the kicked player, and take each of their connections out of the lobby.
        for (const kicked of await clientsOf(withRooms, pin, player)) {
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
