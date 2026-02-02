import { GamePinSchema } from "@durachok/transport";
import { z } from "zod";

import { PlayerNotInLobbyError } from "../../../controllers/common";
import { ensureLobbyAccess } from "../common/auth";
import { factory } from "./ctx";

const onLeave = factory.build({
    event: "leave",
    input: z.tuple([GamePinSchema]),
    handler: async ({ withRooms, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin] = input;
        const meta = { event: "leave", pin, clientId: client.id };

        logger.info(meta, "processing event");
        ensureLobbyAccess(ctx, client, pin);

        const status = await ctx.lobbyService.getStatus(pin);

        // Ensure that the lobby is not in "playing" state when
        // players are locked in.
        if (status !== "waiting") {
            logger.warn(meta, "unable to process event due to in-game lobby");
            client.emit("error", {
                type: "bad_request",
            });
            return;
        }

        try {
            const player = await ctx.lobbyService.getPlayerByConnectionId(pin, client.id);

            logger.info(meta, "removing player from lobby");
            await ctx.lobbyService.removePlayerByConnectionId(pin, client.id);

            const lobby = await ctx.lobbyService.get(pin);

            logger.info(meta, "removing player from game state");
            ctx.gameService(lobby).removePlayer(player.name);

            logger.info(meta, "player removed");
        } catch (err: unknown) {
            if (err instanceof PlayerNotInLobbyError) {
                logger.warn(meta, "failed to process event", err);
                client.emit("error", {
                    type: "bad_request",
                    message: "invalid player.",
                });
                return;
            }

            throw err;
        }

        const lobby = await ctx.lobbyService.get(pin);

        withRooms("lobby").broadcast("lobbyState", {
            update: {
                type: "player_exit",
            },
            lobby,
        });
    },
});

export default onLeave;
