import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { ensureAuth, factory } from "../common/auth";

const onMessage = factory.build({
    event: "message",
    input: z.tuple([GamePinSchema, z.object({ message: z.string() })]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("message", client.id);

        const auth = ensureAuth(client);
        logger.info("messaged", input, auth);
    },
});

export default onMessage;
