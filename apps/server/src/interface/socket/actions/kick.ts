import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { ensureAuth, factory } from "./ctx";

const onKick = factory.build({
    event: "kick",
    input: z.tuple([GamePinSchema, z.object({ id: z.string() })]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("kick", client.id);

        const auth = ensureAuth(client);
        logger.info("kicked", input, auth);
    },
});

export default onKick;
