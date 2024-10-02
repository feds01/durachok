import {
    GamePassPhraseSchema,
    GamePinSchema,
} from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { ensureAuth, factory } from "./ctx";

const onSettingsUpdate = factory.build({
    event: "passphrase",
    input: z.tuple([GamePinSchema, GamePassPhraseSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("passphrase", client.id);

        const auth = ensureAuth(client);
        logger.info("passphrase changed", input, auth);
    },
});

export default onSettingsUpdate;
