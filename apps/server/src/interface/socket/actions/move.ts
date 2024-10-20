import InvalidGameState from "@durachok/engine/src/engine/errors/InvalidGameState";
import { PlayerMoveSchema } from "@durachok/transport/src/schemas/game";
import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { InvalidMoveError } from "../../../controllers/common";
import { assert, expr, isDef } from "../../../utils";
import { ensureLobbyAccess } from "../common/auth";
import { factory } from "./ctx";

const onMove = factory.build({
    event: "move",
    input: z.tuple([GamePinSchema, PlayerMoveSchema]),
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

        // We can't send a move whilst the game is finished.
        if (lobby.status === "finished") {
            logger.warn(meta, "game has finished");
            client.emit("error", {
                type: "stale_game",
                message: "Game has finished.",
            });
        }

        // @@Todo: we should be able to acquire a lock here to ensure that the
        // move can be made atomically in the game state.
        const state = await expr(async () => {
            try {
                return await ctx.gameService(lobby).makeMove(name, move);
            } catch (e: unknown) {
                if (e instanceof InvalidGameState) {
                    logger.warn(meta, "invalid move");
                    client.emit("error", {
                        type: "invalid_move",
                        message: "Invalid move.",
                    });
                } else if (e instanceof InvalidMoveError) {
                    logger.warn(meta, "invalid move");
                    client.emit("error", {
                        type: "invalid_move",
                        message: e.message,
                    });
                }

                // We should return the current game state so that we reset the
                // clients anyway.
                return await ctx.gameService(lobby).get();
            }
        });

        // We need to send the game state to all players.
        const players = await ctx.lobbyService.getPlayers(pin);
        assert(isDef(players));

        const clients = await withRooms(pin).getClients();

        clients.forEach(async (c) => {
            // Find the specific player that this client represents.
            const player = players.find((p) => p.socket === c.id);

            // This must ne a spectator.
            if (!player) {
                c.emit("playerState", {
                    update: state.getStateForSpectator(),
                });
                return;
            }

            await c.emit("playerState", {
                update: state.getStateForPlayer(player.name),
            });
        });
    },
});

export default onMove;
