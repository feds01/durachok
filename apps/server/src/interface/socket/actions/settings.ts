import { GamePinSchema } from "@durachok/transport";
import { z } from "zod";

import { ensureOwnerAccess } from "../common/auth";
import { factory } from "./ctx";

const onSettingsUpdate = factory.build({
    event: "passphrase",
    // @@Todo: perhaps support more settings in the future, i.e. changing game settings
    // directly?
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin] = input;
        const meta = { event: "settings", pin, clientId: client.id };

        logger.info(meta, "processing event");
        await ensureOwnerAccess(ctx, client, pin);

        const lobbyStatus = await ctx.lobbyService.getStatus(pin);

        // Ensure that the lobby is not in "playing" state when
        // players are locked in.
        if (lobbyStatus !== "waiting") {
            logger.info(meta, "cannot change settings when game is not waiting");
            await client.emit("error", {
                type: "bad_request",
                message: "can't change settings when playing.",
            });
            return;
        }

        await ctx.lobbyService.update(pin, {
            passphrase: true,
        });

        logger.info(meta, "settings updated");

        // Re-fetch the lobby and send it to the owner, who alone sees the new passphrase.
        const lobby = await ctx.lobbyService.get(pin, { withPassphrase: true });

        await client.emit("lobbyState", {
            update: {
                type: "settings_update",
            },
            lobby,
        });
    },
});

export default onSettingsUpdate;
