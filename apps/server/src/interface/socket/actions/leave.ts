import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { ensureAuth, factory } from "./ctx";

const onLeave = factory.build({
    event: "leave",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("leave", client.id);

        const auth = ensureAuth(client);
        logger.info("leaving", input, auth);
    },
});

export default onLeave;
