import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { ensureAuth, factory } from "./ctx";

const onStart = factory.build({
    event: "start",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("start", client.id);

        const auth = ensureAuth(client);
        logger.info("starting", input, auth);
    },
});

export default onStart;
