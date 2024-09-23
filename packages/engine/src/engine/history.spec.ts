import { describe, expect, test } from "vitest";

import { Game } from "./game";
import { History } from "./history";

describe("History sub-system tests", () => {
    describe("History", () => {
        test("should create a new game without crashing", () => {
            const game = new Game(["player1", "player2"], null);

            expect(() => new History(game.serialize().state, [])).not.toThrow();
        });
    });
});
