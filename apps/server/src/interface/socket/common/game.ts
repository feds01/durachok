import { Game } from "@durachok/engine";
import { Action } from "@durachok/transport";

import { Context } from "../../../lib/context";
import { Rooms } from "../actions/ctx";

/**
 * Send each player of a lobby the actions that happened, with the game state
 * that they led to, from that player's perspective, and the game's version after them.
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

    await Promise.all(
        clients.map(async (client) => {
            const player = players.find((p) => p.socket === client.id);

            // Spectators aren't supported yet, and the update carries the player's own state.
            if (!player || !game.players.has(player.name)) {
                return;
            }

            await client.emit("action", { actions, update: game.getStateForPlayer(player.name), version });
        }),
    );
}

/**
 * Tell the players of a lobby that its game finished, with the players in the order that
 * they went out, so that the first won and the last is the durak.
 */
export async function emitVictory(withRooms: Rooms, pin: string, game: Game) {
    const players = Array.from(game.players.values())
        .map(({ name, out }) => ({ name, out }))
        .toSorted((a, b) => (a.out ?? Number.MAX_SAFE_INTEGER) - (b.out ?? Number.MAX_SAFE_INTEGER));

    await withRooms(pin).broadcast("victory", { players });
}
