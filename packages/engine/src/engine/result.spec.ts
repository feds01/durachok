import { describe, expect, test } from "bun:test";

import { gameResult } from "./result";

describe("gameResult", () => {
    test("names the first player out as the winner, and the one left with cards as the durak", () => {
        const players = [
            { name: "anna", out: 300 },
            { name: "boris", out: null },
            { name: "clara", out: 100 },
        ];

        expect(gameResult(players)).toEqual({ winners: ["clara"], durak: "boris" });
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
