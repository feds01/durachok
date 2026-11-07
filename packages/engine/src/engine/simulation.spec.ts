import { generateCardDeck } from "./card";
import { InvalidGameState } from "./errors/InvalidGameState";
import { DEFAULT_SETTINGS, Game, GameSettings } from "./game";
import { afterEach, describe, expect, test } from "bun:test";

/**
 * Plays whole games with random legal moves, to check that the engine never
 * reaches a broken state: that no card is duplicated or comes back once it is
 * discarded, that there is always one defender, and that every game finishes.
 */

type Move =
    | { player: string; type: "place"; card: string }
    | { player: string; type: "cover"; card: string; position: number }
    | { player: string; type: "forfeit" };

/** The errors with which the engine reports a broken state, rather than an illegal move. */
const BROKEN_STATE = [/^Invalid game state\.?$/, /^Player is out of the game/];

/** A small seeded random number generator, so that a failing game can be replayed. */
function mulberry32(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const random = Math.random;
afterEach(() => {
    Math.random = random;
});

function clone(game: Game, settings: GameSettings): Game {
    const { state, history } = structuredClone(game.serialize());
    return Game.fromState(state, history, settings);
}

function apply(game: Game, move: Move) {
    switch (move.type) {
        case "place":
            return game.addCardToTableTop(move.player, move.card);
        case "cover":
            return game.coverCardOnTableTop(move.card, move.position);
        case "forfeit":
            return game.finalisePlayerTurn(move.player);
    }
}

/** The moves that the server would pass on to the engine, as its `move` handler does. */
function candidateMoves(game: Game): Move[] {
    const moves: Move[] = [];
    const uncovered = Array.from(game.tableTop.values())
        .map((cover, position) => ({ cover, position }))
        .filter(({ cover }) => cover === null);

    for (const [name, player] of game.players) {
        if (player.out !== null || player.action === "none") continue;

        for (const card of player.deck) {
            moves.push({ player: name, type: "place", card });

            if (player.action === "defend") {
                for (const { position } of uncovered) {
                    moves.push({ player: name, type: "cover", card, position });
                }
            }
        }

        if (game.tableTop.size > 0 && !player.turned) {
            moves.push({ player: name, type: "forfeit" });
        }
    }

    return moves;
}

/**
 * Play a random legal move, on a copy of the game: tries the candidate moves in a random
 * order, and returns the game after the first that the engine accepts, or null if it
 * accepts none of them.
 */
function playRandomMove(game: Game, settings: GameSettings): Game | null {
    const moves = candidateMoves(game);

    while (moves.length > 0) {
        const [move] = moves.splice(Math.floor(Math.random() * moves.length), 1);
        const next = clone(game, settings);

        try {
            apply(next, move);
            return next;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            const illegalMove =
                (error instanceof InvalidGameState && !BROKEN_STATE.some((pattern) => pattern.test(message))) ||
                // A plain `Error` is only expected when the table is full.
                (error instanceof Error && message === "Player deck already full.");

            if (!illegalMove) {
                throw new Error(`${move.type} by ${move.player} broke the game: ${message}`, { cause: error });
            }
        }
    }

    return null;
}

function countCards(game: Game): string[] {
    const hands = Array.from(game.players.values()).flatMap((player) => player.deck);
    const table = Array.from(game.tableTop.entries())
        .flat()
        .filter((card): card is string => card !== null);
    return [...game.deck, ...hands, ...table];
}

function playGame(seed: number, playerCount: number, settings: GameSettings) {
    Math.random = mulberry32(seed);

    const names = Array.from({ length: playerCount }, (_, i) => `p${i}`) as [string, ...string[]];
    let game = new Game(names, null, settings);
    // Covered cards are discarded at the end of a round, so the number of cards
    // in play only ever goes down.
    let inPlay = generateCardDeck(settings.shortGameDeck).length;

    for (let step = 0; step < 2000; step++) {
        const cards = countCards(game);
        expect(new Set(cards).size).toBe(cards.length);
        expect(cards.length).toBeLessThanOrEqual(inPlay);
        inPlay = cards.length;

        if (game.status === "finished") {
            const left = Array.from(game.players.values()).filter((player) => player.out === null);
            expect(left.length).toBeLessThanOrEqual(1);
            return;
        }

        expect(() => game.getDefendingPlayerName()).not.toThrow();
        const next = playRandomMove(game, settings);
        if (!next) {
            throw new Error(`Game with seed ${seed} got stuck: nobody can make a move.`);
        }
        game = next;
    }

    throw new Error(`Game with seed ${seed} didn't finish within 2000 moves.`);
}

describe("Simulated games", () => {
    for (const playerCount of [2, 3, 4, 6]) {
        for (const shortGameDeck of [false, true]) {
            test(`${playerCount} players, ${shortGameDeck ? "short" : "full"} deck`, () => {
                for (let seed = 1; seed <= 10; seed++) {
                    playGame(seed * 7919 + playerCount, playerCount, { ...DEFAULT_SETTINGS, shortGameDeck });
                }
            });
        }
    }
});
