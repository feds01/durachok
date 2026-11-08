import { ClientEvents } from "@durachok/transport";

import { clientsOf, ensureOwnerAccess } from "../common/auth";
import { disconnectClient } from "../io";
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

        // Tell the kicked player, and then close each of their connections, which takes them out of
        // the lobby, so that a page they leave open holds no connection to it.
        for (const kicked of await clientsOf(withRooms, pin, player)) {
            await kicked.emit("close", { reason: "kicked" });
            disconnectClient(kicked.id);
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
