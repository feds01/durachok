import { Game } from "@durachok/engine";
import { Action } from "@durachok/transport";

import { Context } from "../../context";
import { MoveResult } from "../../../controllers/game";
import { Rooms } from "../actions/ctx";
import { isSpectator } from "./auth";

/**
 * Send each player of a lobby the actions that happened, with the game state
 * that they led to, from that player's perspective, and the game's version after them.
 * Spectators are sent the game as a spectator sees it, without anyone's cards.
 */
export async function emitActions(
    ctx: Context,
    withRooms: Rooms,
    pin: string,
    game: Game,
    actions: Action[],
    version: number,
) {
    const players = await ctx.lobbyService.getPlayers(pin);
    const clients = await withRooms(pin).getClients();
    const spectatorState = game.getStateForSpectator();

    await Promise.all(
        clients.map(async (client) => {
            if (isSpectator(client)) {
                await client.emit("spectate", { actions, update: spectatorState, version });
                return;
            }

            // The update carries the player's own state, so only the game's players are sent one.
            const player = players.find((p) => p.socket === client.id);
            if (!player || !game.players.has(player.name)) {
                return;
            }

            await client.emit("action", { actions, update: game.getStateForPlayer(player.name), version });
        }),
    );
}

/**
 * Tell the players of a lobby that its game finished, with the players in the order that
 * they went out, so that the first won and the last is the durak, @see Game.getResults.
 */
export async function emitVictory(withRooms: Rooms, pin: string, game: Game) {
    await withRooms(pin).broadcast("victory", { players: game.getResults() });
}

/**
 * Send each player the game as a move, or a player's removal, left it. Once the game has
 * finished, tell them how it ended, and send them back to the lobby, which waits for another.
 */
export async function emitGameChange(ctx: Context, withRooms: Rooms, pin: string, change: MoveResult) {
    const { game, actions, version } = change;
    await emitActions(ctx, withRooms, pin, game, actions, version);

    if (!game.isFinished()) {
        return;
    }

    ctx.logger.info({ pin }, "game finished");
    await ctx.lobbyService.finishGame(pin);
    await emitVictory(withRooms, pin, game);
    await withRooms(pin).broadcast("lobbyState", {
        update: { type: "game_over" },
        lobby: await ctx.lobbyService.get(pin),
    });
}
