import { describe, expect, test } from "bun:test";

import { gameResult, roundsOf } from "./result";

describe("gameResult", () => {
    test("names the first player out as the winner, and the one left with cards as the durak", () => {
        const players = [
            { name: "anna", out: 300 },
            { name: "boris", out: null },
            { name: "clara", out: 100 },
        ];

        expect(gameResult(players)).toEqual({ winners: ["clara"], durak: "boris" });
    });

    test("leaves out a player whom the owner removed, even one removed before anyone went out", () => {
        const result = gameResult([
            { name: "removed", out: 5, removed: true },
            { name: "first", out: 10 },
            { name: "left", out: null },
        ]);

        expect(result).toEqual({ winners: ["first"], durak: "left" });
    });

    test("names every player who went out first in the same round as a winner", () => {
        const players = [
            { name: "anna", out: 100 },
            { name: "boris", out: 100 },
            { name: "clara", out: null },
        ];

        expect(gameResult(players)).toEqual({ winners: ["anna", "boris"], durak: "clara" });
    });

    test("has no durak when the last players went out together", () => {
        const players = [
            { name: "anna", out: 100 },
            { name: "boris", out: 200 },
            { name: "clara", out: 200 },
        ];

        expect(gameResult(players)).toEqual({ winners: ["anna"], durak: null });
    });
});

describe("roundsOf", () => {
    const actors = { attacker: "anna", defender: "boris" };

    test("counts the round that starts the game and each new one after it", () => {
        const history = [
            { type: "start", actors },
            { type: "place", player: "anna", card: "6H" },
            { type: "new_round", actors },
            { type: "new_round", actors },
            { type: "victory" },
        ] as const;

        expect(roundsOf(history)).toBe(3);
    });

    test("counts no rounds in a history without any", () => {
        expect(roundsOf([])).toBe(0);
    });
});
