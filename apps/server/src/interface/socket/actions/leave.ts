import { ClientEvents } from "@durachok/transport";

import { clientsOf, ensureLobbyAccess } from "../common/auth";
import { context } from "../context";
import { factory } from "./ctx";

const onLeave = factory.build({
    event: "leave",
    input: ClientEvents.leave,
    handler: async ({ withRooms, input, client, logger }) => {
        const [pin] = input;
        const meta = { event: "leave", pin, clientId: client.id };

        logger.info(meta, "processing event");
        const { name } = await ensureLobbyAccess(context, client, pin);

        // Only possible before the game starts, and not for the owner. Each of the player's
        // connections leaves the room, so that another tab doesn't go on hearing the lobby.
        const player = await context.lobbyService.removePlayer(pin, name);
        for (const theirs of await clientsOf(withRooms, pin, player)) {
            await theirs.leave(pin);
        }
        await client.leave(pin);
        logger.info(meta, "player left");

        await withRooms(pin).broadcast("lobbyState", {
            update: {
                type: "player_exit",
            },
            lobby: await context.lobbyService.get(pin),
        });
    },
});

export default onLeave;
