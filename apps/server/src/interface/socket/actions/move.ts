import { PlayerMoveSchema } from "@durachok/transport/src/schemas/game";
import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { ensureAuth, factory } from "../common/auth";

const onMove = factory.build({
    event: "move",
    input: z.tuple([GamePinSchema, PlayerMoveSchema]),
    handler: async ({ input, client, logger: $ctx }) => {
        const { ctx: _ } = $ctx;
        const logger = $ctx;
        logger.info("move", client.id);

        const auth = ensureAuth(client);
        logger.info("moved", input, auth);
    },
});

export default onMove;
