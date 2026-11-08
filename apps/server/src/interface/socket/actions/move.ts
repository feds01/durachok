import { InvalidGameState } from "@durachok/engine";
import { ClientEvents } from "@durachok/transport";

import { ensureLobbyAccess } from "../common/auth";
import { emitActions, emitVictory } from "../common/game";
import { factory } from "./ctx";

const onMove = factory.build({
    event: "move",
    input: ClientEvents.move,
    handler: async ({ input, withRooms, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [pin, move] = input;
        const meta = {
            event: "move",
            pin,
            clientId: client.id,
            moveType: move.type,
        };

        logger.info(meta, "processing event");
        const { name } = await ensureLobbyAccess(ctx, client, pin);

        const lobby = await ctx.lobbyService.get(pin);

        // We can only make moves in a game that's being played.
        if (lobby.status !== "playing") {
            logger.warn(meta, "no game is being played");
            await client.emit("error", {
                type: "stale_game",
                message: "No game is being played.",
            });
            return;
        }

        const gameService = ctx.gameService(lobby);

        try {
            const { game, actions, version } = await gameService.makeMove(name, move);
            await emitActions(ctx, withRooms, pin, game, actions, version);

            if (game.isFinished()) {
                logger.info(meta, "game finished");
                await ctx.lobbyService.finishGame(pin);
                await emitVictory(withRooms, pin, game);
                // The lobby waits for another game, so the players go back to its waiting room.
                await withRooms(pin).broadcast("lobbyState", {
                    update: { type: "game_over" },
                    lobby: await ctx.lobbyService.get(pin),
                });
            }
        } catch (e: unknown) {
            if (!(e instanceof InvalidGameState)) {
                throw e;
            }

            // Tell the player why, and send them the game state so that they can
            // undo whatever they showed before the server answered.
            logger.warn({ ...meta, reason: e.message }, "invalid move");
            await client.emit("error", { type: "invalid_move", message: e.message });
            await client.emit("playerState", await gameService.getGameStateFor(name));
        }
    },
});

export default onMove;
