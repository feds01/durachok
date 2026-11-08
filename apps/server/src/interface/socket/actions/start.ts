import { ClientEvents } from "@durachok/transport";

import { GAME_COUNTDOWN_MS } from "../../../config";
import { ensureOwnerAccess } from "../common/auth";
import { emitActions } from "../common/game";
import { factory } from "./ctx";

const onStart = factory.build({
    event: "start",
    input: ClientEvents.start,
    handler: async ({ withRooms, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin] = input;
        const meta = { event: "start", pin, clientId: client.id };

        logger.info(meta, "processing event");
        await ensureOwnerAccess(ctx, client, pin);

        // Lock in the connected players, and create the game for them.
        const players = await ctx.lobbyService.startGame(pin);
        const lobby = await ctx.lobbyService.get(pin);
        const { game, version } = await ctx.gameService(lobby).create(players);
        logger.info({ ...meta, players }, "game created");

        await withRooms(pin).broadcast("lobbyState", { update: { type: "settings_update" }, lobby });
        await withRooms(pin).broadcast("countdown");
        await new Promise((resolve) => setTimeout(resolve, GAME_COUNTDOWN_MS));

        // Send each player the game, with who attacks and defends first.
        await withRooms(pin).broadcast("start");
        await emitActions(ctx, withRooms, pin, game, game.history.serialize().nodes, version);
    },
});

export default onStart;
