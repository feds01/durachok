import { GamePinSchema } from "@durachok/transport";
import { z } from "zod";

import { PlayerNotInLobbyError } from "../../../controllers/common";
import { ensureOwnerAccess } from "../common/auth";
import { factory } from "./ctx";

const onKick = factory.build({
    event: "kick",
    input: z.tuple([GamePinSchema, z.object({ id: z.string() })]),
    handler: async ({ withRooms, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin, { id }] = input;
        const meta = { event: "kick", pin, clientId: client.id };

        logger.info(meta, "processing event");
        await ensureOwnerAccess(ctx, client, pin);

        const status = await ctx.lobbyService.getStatus(pin);

        // Ensure that the lobby is not in "playing" state when
        // players are locked in.
        if (status !== "waiting") {
            logger.info(meta, "cannot kick player when game is not waiting");
            client.emit("error", {
                type: "bad_request",
                message: "can't kick player when playing.",
            });
            return;
        }

        try {
            const player = await ctx.lobbyService.getPlayerByConnectionId(pin, id);

            logger.info(meta, "removing player from lobby");
            await ctx.lobbyService.removePlayerByConnectionId(pin, id);

            const lobby = await ctx.lobbyService.get(pin);

            logger.info(meta, "removing player from game state");
            ctx.gameService(lobby).removePlayer(player.name);

            logger.info(meta, "player removed");
        } catch (err: unknown) {
            if (err instanceof PlayerNotInLobbyError) {
                logger.warn(meta, "failed to kick player from lobby because they don't exist", err);
                client.emit("error", {
                    type: "bad_request",
                    message: "invalid player.",
                });
                return;
            }

            throw err;
        }

        const lobby = await ctx.lobbyService.get(pin);

        // Send a message to all players in the lobby that a player has been
        // kicked.
        withRooms("lobby").broadcast("lobbyState", {
            update: {
                type: "player_exit",
            },
            lobby,
        });
    },
});

export default onKick;
