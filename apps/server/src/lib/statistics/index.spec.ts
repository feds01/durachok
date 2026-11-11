import { describe, expect, test } from "bun:test";

import { PlayerOutcome, STATISTICS, countOutcome, toUserStatistics } from ".";

/** A player's part in a game of 12 rounds, which anna won, and boris lost as the durak. */
function outcome(name: string, owner = false): PlayerOutcome {
    return { name, owner, removed: false, result: { winners: ["anna"], durak: "boris" }, rounds: 12, history: [] };
}

describe("countOutcome", () => {
    test("counts a game that the owner removed the player from only as resigned", () => {
        expect(countOutcome({ ...outcome("dmitri"), removed: true })).toEqual({ gamesResigned: 1 });
    });

    test("counts a game that the player won in their games played and won, and its rounds", () => {
        expect(countOutcome(outcome("anna"))).toEqual({ gamesPlayed: 1, gamesWon: 1, roundsPlayed: 12 });
    });

    test("counts a game that the player lost as the durak in their games lost", () => {
        expect(countOutcome(outcome("boris"))).toEqual({ gamesPlayed: 1, gamesLost: 1, roundsPlayed: 12 });
    });

    test("counts a game that the player neither won nor lost as played, and hosted by its owner", () => {
        expect(countOutcome(outcome("clara", true))).toEqual({ gamesPlayed: 1, gamesHosted: 1, roundsPlayed: 12 });
    });
});

describe("the registry", () => {
    test("gives every statistic an id of its own, a name and a description", () => {
        const ids = STATISTICS.map(({ id }) => id);

        expect(new Set(ids).size).toBe(ids.length);
        for (const { name, description } of STATISTICS) {
            expect(name).not.toBe("");
            expect(description).not.toBe("");
        }
    });
});

describe("toUserStatistics", () => {
    test("averages the rounds over the games played", () => {
        const stored = {
            gamesPlayed: 4,
            gamesWon: 1,
            gamesLost: 2,
            gamesHosted: 3,
            gamesResigned: 1,
            roundsPlayed: 50,
        };

        expect(toUserStatistics(stored)).toEqual({
            gamesPlayed: 4,
            gamesWon: 1,
            gamesLost: 2,
            gamesHosted: 3,
            gamesResigned: 1,
            averageRounds: 12.5,
        });
    });

    test("has no average without any games", () => {
        const stored = { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, gamesHosted: 0, gamesResigned: 0, roundsPlayed: 0 };

        expect(toUserStatistics(stored).averageRounds).toBe(0);
    });
});
