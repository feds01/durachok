import { cardFromString } from "./card";
import { DEFAULT_SETTINGS, Game } from "./game";
import { describe, expect, test } from "bun:test";

interface Round {
    /** Each player's cards. */
    hands: Record<string, string[]>;
    attacker: string;
    defender: string;
    /** The cards left in the deck. */
    deck: string[];
}

/** Set every player's hand and role, so that a test can play out a known round. */
function setUpRound(game: Game, { hands, attacker, defender, deck }: Round) {
    for (const [name, player] of game.players) {
        player.deck = hands[name];
        player.out = null;
        player.turned = false;
        player.beganRound = name === attacker;
        player.action = name === attacker ? "attack" : name === defender ? "defend" : "none";
    }
    game.deck = deck;
    game.tableTop.clear();
}

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

    test("a player who goes out at the end of a round doesn't defend the next one", () => {
        const game = new Game(["a", "b", "c"], null, { ...DEFAULT_SETTINGS, randomisePlayerOrder: false });
        game.trump = cardFromString("2H");

        // c, who would defend next, attacks with their last card while one card is left in
        // the deck, which goes to a when the hands are refilled.
        setUpRound(game, {
            hands: { a: ["7S", "KC"], b: ["8S", "8D", "AC"], c: ["7D"] },
            attacker: "a",
            defender: "b",
            deck: ["9C"],
        });
        game.addCardToTableTop("a", "7S");
        game.finalisePlayerTurn("a");
        game.addCardToTableTop("c", "7D");
        game.coverCardOnTableTop("8S", 0);
        game.coverCardOnTableTop("8D", 1);
        game.finalisePlayerTurn("a");
        game.finalisePlayerTurn("c");

        expect(game.getPlayer("c").out).not.toBeNull();
        expect(game.getDefendingPlayerName()).toBe("a");
        expect(game.getAttackingPlayerName()).toBe("b");
    });
});
