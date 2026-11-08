import { DEFAULT_SETTINGS, Game, GameSettings, InvalidGameState } from "@durachok/engine";
import { PlayerMove } from "@durachok/transport";

import { observe } from "./observation";
import { Strategy } from "./strategy";

/** How a game between strategies ended. */
export interface GameResult {
    /** The players who went out of the game, in the order that they did. */
    order: string[];
    /** The player left holding cards, who lost, if any. */
    durak: string | null;
}

/**
 * Play a game between strategies on the engine, without a server, as their bots would play
 * it in a lobby: in turn, each player who can move asks their strategy for a move, from what
 * they would be told.
 *
 * @param seats - The players, by name, and how each decides their moves.
 */
export async function playGame(
    seats: Record<string, Strategy>,
    settings: GameSettings = DEFAULT_SETTINGS,
    maxMoves = 5000,
): Promise<GameResult> {
    const names = Object.keys(seats) as [string, ...string[]];
    const game = new Game(names, null, settings);
    const signal = new AbortController().signal;
    // The moves that the game refused since it last changed, which a player doesn't make again.
    const refused = new Map<string, PlayerMove[]>();

    for (let turn = 0; !game.isFinished(); turn++) {
        if (turn >= maxMoves) {
            throw new Error(`The game didn't finish within ${maxMoves} moves`);
        }

        const history = game.history.serialize().nodes;
        const players = names
            .map((name) => ({
                name,
                observation: observe(game.getStateForPlayer(name), [...history], refused.get(name)),
            }))
            .filter(({ observation }) => observation.moves.length > 0);
        if (players.length === 0) {
            throw new Error("Nobody can move");
        }

        const { name, observation } = players[turn % players.length]!;
        const move = await seats[name]!.decide(observation, signal);
        try {
            game.makeMove(name, move);
            refused.clear();
        } catch (error: unknown) {
            // In mythic mode, the player isn't told enough to know that the game would refuse some moves.
            if (!(error instanceof InvalidGameState)) {
                throw error;
            }
            refused.set(name, [...(refused.get(name) ?? []), move]);
        }
    }

    return resultOf(game);
}

/** How many games each strategy lost, out of some games between them all. */
export async function tournament(
    strategies: Record<string, Strategy>,
    games: number,
    settings: GameSettings = DEFAULT_SETTINGS,
): Promise<Record<string, number>> {
    const losses: Record<string, number> = Object.fromEntries(Object.keys(strategies).map((name) => [name, 0]));

    for (let played = 0; played < games; played++) {
        const { durak } = await playGame(strategies, settings);
        if (durak) {
            losses[durak]! += 1;
        }
    }

    return losses;
}

function resultOf(game: Game): GameResult {
    const players = Array.from(game.players.values());
    const order = players
        .filter(({ out }) => out !== null)
        .toSorted((a, b) => a.out! - b.out!)
        .map(({ name }) => name);
    const left = players.filter(({ out }) => out === null);

    return { order, durak: left.length === 1 ? left[0]!.name : null };
}
