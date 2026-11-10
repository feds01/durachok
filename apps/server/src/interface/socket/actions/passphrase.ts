import { ClientEvents } from "@durachok/transport";

import { ensureOwnerAccess } from "../common/auth";
import { context } from "../context";
import { factory } from "./ctx";

/** Give the lobby a new passphrase, which the owner's waiting room asks for every so often. */
const onPassphrase = factory.build({
    event: "passphrase",
    input: ClientEvents.passphrase,
    handler: async ({ input, client, logger }) => {
        const [pin] = input;
        const meta = { event: "passphrase", pin, clientId: client.id };

        logger.info(meta, "processing event");
        await ensureOwnerAccess(context, client, pin);
        await context.lobbyService.rotatePassphrase(pin);

        // Only the owner sees the passphrase, so only they are sent the new one.
        await client.emit("lobbyState", {
            update: { type: "settings_update" },
            lobby: await context.lobbyService.get(pin, { withPassphrase: true }),
        });
    },
});

export default onPassphrase;
