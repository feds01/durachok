import { ClientEvents } from "@durachok/transport";

import { clientsOf, ensureOwnerAccess } from "../common/auth";
import { emitGameChange } from "../common/game";
import { disconnectClient } from "../io";
import { context } from "../context";
import { factory } from "./ctx";
import { isDef } from "../../../utils";

const onKick = factory.build({
    event: "kick",
    /** The player to kick, by their name in the lobby. */
    input: ClientEvents.kick,
    handler: async ({ withRooms, input, client, logger }) => {
        const [pin, { name }] = input;
        const meta = { event: "kick", pin, clientId: client.id, name };

        logger.info(meta, "processing event");
        await ensureOwnerAccess(context, client, pin);

        // Not the owner, and the player can't join again. During a game, they leave it too.
        const lobby = await context.lobbyService.get(pin);
        const { player, removal } = await context.lobbyService.kick(pin, name, context.gameService(lobby));
        logger.info({ ...meta, duringGame: isDef(removal) }, "player kicked");

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
            lobby: await context.lobbyService.get(pin),
        });

        // The others play on without them, or the game ends.
        if (isDef(removal)) {
            await emitGameChange(context, withRooms, pin, removal);
        }
    },
});

export default onKick;
