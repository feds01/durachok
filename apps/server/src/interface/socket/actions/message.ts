import { ClientEvents } from "@durachok/transport";

import { ensureLobbyAccess } from "../common/auth";
import { factory } from "./ctx";

const onMessage = factory.build({
    event: "message",
    input: ClientEvents.message,
    handler: async ({ withRooms, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin, { message }] = input;
        const meta = { event: "message", pin, clientId: client.id };

        logger.info(meta, "processing event");
        await ensureLobbyAccess(ctx, client, pin);

        const payload = await ctx.lobbyService.sendMessage(pin, client.id, message);

        withRooms(pin).broadcast("message", payload);
    },
});

export default onMessage;
