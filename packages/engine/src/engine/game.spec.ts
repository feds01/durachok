import { DEFAULT_SETTINGS, Game } from "./game";
import { describe, expect, test } from "bun:test";

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

        expect(Game.fromState(save.state, save.history, DEFAULT_SETTINGS)).toStrictEqual(game);
    });

    test("Game.fromState re-creates correct state after move", () => {
        const game = new Game(["player1", "player2"], null);
        const attacker = game.getAttackingPlayerName();

        // Adds the attackers first card onto table top
        game.addCardToTableTop(attacker, game.getPlayer(attacker).deck[0]);

        const save = game.serialize();
        expect(Game.fromState(save.state, save.history, DEFAULT_SETTINGS)).toStrictEqual(game);
    });

    test("a defender who picks up the cards stays the defender until the round ends", () => {
        const game = new Game(["player1", "player2"], null);
        const attacker = game.getAttackingPlayerName();
        const defender = game.getDefendingPlayerName();

        game.addCardToTableTop(attacker, game.getPlayer(attacker).deck[0]);
        game.finalisePlayerTurn(defender);
        expect(game.getDefendingPlayerName()).toBe(defender);

        // Once the attacker is done too, the defender takes the card, and with two
        // players they defend again.
        game.finalisePlayerTurn(attacker);
        expect(game.tableTop.size).toBe(0);
        expect(game.getPlayer(defender).deck).toHaveLength(7);
        expect(game.getDefendingPlayerName()).toBe(defender);
    });
});
