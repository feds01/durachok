import { GamePinSchema } from "@durachok/transport";
import { z } from "zod";

import { PlayerNotInLobbyError } from "../../../controllers/common";
import { assert, isDef } from "../../../utils";
import { ensureOwnerAccess } from "../common/auth";
import { factory } from "./ctx";

const onStart = factory.build({
    event: "start",
    input: z.tuple([GamePinSchema]),
    handler: async ({ withRooms, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [[pin]] = input;
        const meta = { event: "start", pin, clientId: client.id };

        logger.info(meta, "processing event");
        await ensureOwnerAccess(ctx, client, pin);

        const status = await ctx.lobbyService.getStatus(pin);

        // Ensure that the lobby is not in "playing" state when
        // players are locked in.
        if (status !== "waiting") {
            logger.info(meta, "cannot start game when game is not waiting");
            client.emit("error", {
                type: "bad_request",
                message: "can't kick player when playing.",
            });
            return;
        }

        const players = await ctx.lobbyService.getPlayers(pin);
        assert(isDef(players));

        const playerCount = players.filter((p) => p.socket).length;

        // @@Todo: perhaps we should just do this through `zod` validation?
        if (playerCount < 2) {
            logger.info(meta, "cannot start game with less than 2 players");
            client.emit("error", {
                type: "bad_request",
                message: "can't start game with less than 2 players.",
            });
            return;
        }

        // "start" the game.
        const lobby = await ctx.lobbyService.get(pin);

        // Initiate the countdown, and begin.
        withRooms(pin).broadcast("countdown");
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const game = ctx.gameService(lobby);

        // We need to send the game state to all players.
        const clients = await withRooms(pin).getClients();

        clients.forEach(async (c) => {
            // Find the specific player that this client represents.
            const player = players.find((p) => p.socket === c.id);

            if (!player) {
                logger.error(meta, "player not found");
                throw new PlayerNotInLobbyError();
            }

            await c.emit("playerState", {
                update: await game.getGameStateFor(player.name),
            });
        });

        // Finally, "start" the game.
        await game.start();
        await withRooms(pin).broadcast("start");
    },
});

export default onStart;
