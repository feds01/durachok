import { describe, expect, test } from "bun:test";

import { statisticTiles } from "./statistics";

describe("statisticTiles", () => {
    test("shows the games played, won and lost as the durak, in that order", () => {
        expect(statisticTiles({ gamesPlayed: 3, gamesWon: 1, gamesLost: 2 })).toEqual([
            { label: "Played", value: "3" },
            { label: "Won", value: "1" },
            { label: "Durak", value: "2" },
        ]);
    });

    test("groups the digits of a large count", () => {
        expect(statisticTiles({ gamesPlayed: 1204, gamesWon: 0, gamesLost: 0 })[0]?.value).toBe("1,204");
    });
});
