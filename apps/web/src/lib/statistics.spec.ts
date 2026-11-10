import { describe, expect, test } from "bun:test";

import { statisticTiles } from "./statistics";

/** A player's statistics, with nothing in them but what a test sets. */
const NONE = { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, gamesHosted: 0, averageRounds: 0 };

describe("statisticTiles", () => {
    test("shows the games played, won, lost as the durak and hosted, and the rounds a game, in that order", () => {
        expect(
            statisticTiles({ gamesPlayed: 3, gamesWon: 1, gamesLost: 2, gamesHosted: 2, averageRounds: 14 }),
        ).toEqual([
            { label: "Played", value: "3" },
            { label: "Won", value: "1" },
            { label: "Durak", value: "2" },
            { label: "Hosted", value: "2" },
            { label: "Rounds a game", value: "14" },
        ]);
    });

    test("groups the digits of a large count", () => {
        expect(statisticTiles({ ...NONE, gamesPlayed: 1204 })[0]?.value).toBe("1,204");
    });

    test("shows the rounds a game to one decimal place", () => {
        expect(statisticTiles({ ...NONE, averageRounds: 12.345 }).at(-1)?.value).toBe("12.3");
    });
});
