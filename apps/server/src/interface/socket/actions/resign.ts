import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { ensureAuth, factory } from "../common/auth";

const onResign = factory.build({
    event: "resign",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("resign", client.id);

        const auth = ensureAuth(client);
        logger.info("resigning", input, auth);
    },
});

export default onResign;
