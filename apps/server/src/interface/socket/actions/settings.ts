import { GamePinSchema, GameSettingsSchema } from "@durachok/transport";
import { z } from "zod";

import { ensureOwnerAccess } from "../common/auth";
import { factory } from "./ctx";

/** Change the lobby's settings, which only its owner can, before the game starts. */
const onSettings = factory.build({
    event: "settings",
    input: z.tuple([GamePinSchema, GameSettingsSchema]),
    handler: async ({ input, client, withRooms, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin, settings] = input;
        const meta = { event: "settings", pin, clientId: client.id };

        logger.info(meta, "processing event");
        await ensureOwnerAccess(ctx, client, pin);
        await ctx.lobbyService.updateSettings(pin, settings);
        logger.info(meta, "settings updated");

        // Everyone sees the new settings, and the owner the passphrase too, after the
        // update for the room, so that theirs is the one that sticks.
        await withRooms(pin).broadcast("lobbyState", {
            update: { type: "settings_update" },
            lobby: await ctx.lobbyService.get(pin),
        });
        await client.emit("lobbyState", {
            update: { type: "settings_update" },
            lobby: await ctx.lobbyService.get(pin, { withPassphrase: true }),
        });
    },
});

export default onSettings;
