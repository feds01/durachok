import { describe, expect, test } from "vitest";

import { DEFAULT_SETTINGS, Game } from "./game";

describe("Game tests", () => {
    test("should create a new game without crashing", () =>
        expect(() => new Game(["player1", "player2"], null)).not.toThrow());

    test("Game constructor should throw when shortDeck is enabled and there are more than six players", () =>
        expect(
            () =>
                new Game(["0", "1", "2", "3", "4", "5", "6"], null, {
                    ...DEFAULT_SETTINGS,
                    shortGameDeck: true,
                }),
        ).toThrow());

    test("Game.fromState should produce the same object", () => {
        const game = new Game(["player1", "player2"], null, DEFAULT_SETTINGS);
        const save = game.serialize();

        expect(
            Game.fromState(save.state, save.history, DEFAULT_SETTINGS),
        ).toStrictEqual(game);
    });

    test("Game.fromState re-creates correct state after move", () => {
        const game = new Game(["player1", "player2"], null);
        const attacker = game.getAttackingPlayerName();

        // Adds the attackers first card onto table top
        game.addCardToTableTop(attacker, game.getPlayer(attacker).deck[0]);

        const save = game.serialize();
        expect(
            Game.fromState(save.state, save.history, DEFAULT_SETTINGS),
        ).toStrictEqual(game);
    });
});
