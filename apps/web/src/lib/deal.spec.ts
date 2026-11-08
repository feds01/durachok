import { describe, expect, test } from "bun:test";

import { PlayerGameState } from "@durachok/transport";

import { dealAfter, drawnCount, NO_DEAL } from "./deal";
import { TableUpdate } from "./table";

const quiet: TableUpdate = { mine: [], playedBy: new Map(), pickup: null, newRound: false, clearTo: null };

const opponent = (name: string, size: number | null) => ({
    name,
    deck: { type: "hidden" as const, size },
    out: null,
    turned: false,
    beganRound: false,
    action: "none" as const,
});

const game = (deck: string[], ...players: ReturnType<typeof opponent>[]): PlayerGameState => ({
    player: { name: "me", deck, out: null, turned: false, beganRound: true, action: "attack" },
    players,
    tableTop: {},
    deckSize: 24,
    discardSize: 0,
    trump: { suit: "H", card: "AH", value: 14 },
});

describe("drawnCount", () => {
    test("counts the cards that a player gained, less the ones they took from the table", () => {
        expect(drawnCount(undefined, 6, 0)).toBe(6);
        expect(drawnCount(3, 6, 0)).toBe(3);
        expect(drawnCount(2, 6, 2)).toBe(2);
        expect(drawnCount(6, 5, 0)).toBe(0);
    });

    test("counts nothing for a hand whose size isn't told, before or after", () => {
        expect(drawnCount(undefined, null, 0)).toBe(0);
        // A player who goes out in mythic mode is shown everyone's cards, which they didn't draw.
        expect(drawnCount(null, 4, 0)).toBe(0);
    });
});

describe("dealAfter", () => {
    test("deals to the player and to each other player in turn", () => {
        const deal = dealAfter(NO_DEAL, game(["6S", "7S"], opponent("misha", 2), opponent("katya", 2)), quiet)!;
        expect([...deal.drawn]).toEqual([
            ["6S", 0],
            ["7S", 0.18],
        ]);
        expect(deal.flights.map(({ to, delay }) => [to, Number(delay.toFixed(2))])).toEqual([
            ["misha", 0.06],
            ["misha", 0.24],
            ["katya", 0.12],
            ["katya", 0.3],
        ]);
        expect(deal.flights.map(({ id }) => id)).toEqual([1, 2, 3, 4]);
    });

    test("changes nothing for an update that dealt nothing", () => {
        const start = game(["6S"], opponent("misha", 1));
        const deal = dealAfter(NO_DEAL, start, quiet)!;
        expect(dealAfter(deal, start, quiet)).toBeNull();
    });

    test("waits for the table to clear at the end of a round", () => {
        const deal = dealAfter(NO_DEAL, game(["6S"]), { ...quiet, newRound: true })!;
        expect(deal.drawn.get("6S")).toBe(0.45);
    });

    test("doesn't fly the cards that the player took from the table from the deck", () => {
        const before = dealAfter(NO_DEAL, game(["6S"]), quiet)!;
        const pickup = { type: "pickup" as const, cards: ["7S"], player: "me" };
        const after = dealAfter(before, game(["6S", "7S", "8S"]), { ...quiet, pickup, newRound: true })!;
        expect([...after.drawn.keys()]).toEqual(["8S"]);
    });

    test("deals nobody face-down cards in mythic mode", () => {
        const deal = dealAfter(NO_DEAL, game(["6S"], opponent("misha", null)), quiet)!;
        expect(deal.flights).toEqual([]);
    });
});
