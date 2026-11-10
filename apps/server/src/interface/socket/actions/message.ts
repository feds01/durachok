import { ClientEvents } from "@durachok/transport";

import { limits } from "../../../lib/limits";
import { tooManyRequests } from "../../trpc";
import { ensureLobbyAccess } from "../common/auth";
import { context } from "../context";
import { factory } from "./ctx";

const onMessage = factory.build({
    event: "message",
    input: ClientEvents.message,
    handler: async ({ withRooms, input, client, logger }) => {
        const [pin, { message }] = input;
        const meta = { event: "message", pin, clientId: client.id };

        logger.info(meta, "processing event");
        const { name } = await ensureLobbyAccess(context, client, pin);

        // A player can only say so much at once, so that nobody floods the chat.
        if (!limits.chat.take(`${pin}:${name}`)) {
            throw tooManyRequests();
        }

        const payload = await context.lobbyService.sendMessage(pin, client.id, message);

        withRooms(pin).broadcast("message", payload);
    },
});

export default onMessage;
