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

/** A round between two players, a attacking b, with hearts as trumps and a card left in the deck. */
function twoPlayers(hands: Record<string, string[]>): Game {
    const game = new Game(["a", "b"], null, { ...DEFAULT_SETTINGS, randomisePlayerOrder: false });
    game.trump = cardFromString("2H");
    setUpRound(game, { hands, attacker: "a", defender: "b", deck: ["9C"] });
    return game;
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

    test("when the deal uses up the deck, the trump is a dealt card that stays in its player's hand", () => {
        // Six players take all 36 cards of the short deck.
        const game = new Game(["0", "1", "2", "3", "4", "5"], null, { ...DEFAULT_SETTINGS, shortGameDeck: true });

        expect(game.deck).toHaveLength(0);
        const hands = Array.from(game.players.values()).flatMap((player) => player.deck);
        expect(hands).toHaveLength(36);
        expect(hands).toContain(game.trump.card);
    });

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

    test("a beaten card can't be beaten again, so the card that beat it isn't lost", () => {
        const game = new Game(["a", "b"], null, { ...DEFAULT_SETTINGS, randomisePlayerOrder: false });
        game.trump = cardFromString("2H");
        setUpRound(game, {
            hands: { a: ["7S", "7C"], b: ["8S", "9S", "AC"] },
            attacker: "a",
            defender: "b",
            deck: ["9C"],
        });
        game.addCardToTableTop("a", "7S");
        game.addCardToTableTop("a", "7C");
        game.coverCardOnTableTop("8S", 0);

        expect(() => game.coverCardOnTableTop("9S", 0)).toThrow("already covered");
        expect(game.tableTop.get("7S")).toBe("8S");
        expect(game.getPlayer("b").deck).toContain("9S");
    });

    test("the defender can't pass the attack on before a card is played", () => {
        const game = new Game(["a", "b", "c"], null, { ...DEFAULT_SETTINGS, randomisePlayerOrder: false });
        game.trump = cardFromString("2H");
        setUpRound(game, {
            hands: { a: ["7S"], b: ["7D", "8D"], c: ["9C", "10C"] },
            attacker: "a",
            defender: "b",
            deck: ["9D"],
        });

        expect(() => game.addCardToTableTop("b", "7D")).toThrow("Improper card for the transfer");
        expect(game.getDefendingPlayerName()).toBe("b");
    });

    test("in mythic mode, nobody is told how many cards the deck or the other players hold", () => {
        const game = new Game(["a", "b"], null, { ...DEFAULT_SETTINGS, mythicMode: true });
        const view = game.getStateForPlayer("a");

        expect(view.deckSize).toBeNull();
        expect(view.players[0].deck).toEqual({ type: "hidden", size: null });
        expect(view.player.deck).toHaveLength(6);
        expect(
            game.getStateForSpectator().players.every(({ deck }) => deck.type === "hidden" && deck.size === null),
        ).toBe(true);

        // An empty deck shows, as the trump card that lay under it is gone.
        game.deck = [];
        expect(game.getStateForPlayer("a").deckSize).toBe(0);
    });

    test("the players are told how many cards were discarded, and in mythic mode only whether any were", () => {
        for (const mythicMode of [false, true]) {
            const game = new Game(["a", "b"], null, { ...DEFAULT_SETTINGS, randomisePlayerOrder: false, mythicMode });
            game.trump = cardFromString("2H");
            setUpRound(game, {
                hands: { a: ["7S", "QC"], b: ["8S", "AC"] },
                attacker: "a",
                defender: "b",
                deck: ["9C"],
            });
            expect(game.getStateForPlayer("a").discardSize).toBe(mythicMode ? null : 52 - 5);

            // Nothing has been beaten in a new game, which every player can see.
            const fresh = new Game(["a", "b"], null, { ...DEFAULT_SETTINGS, mythicMode });
            expect(fresh.getStateForPlayer("a").discardSize).toBe(0);
        }
    });

    describe("an attacker who is done", () => {
        test("is asked again when the defender beats a card, even with a rank already on the table", () => {
            const game = twoPlayers({ a: ["7S", "7D", "8C", "QC"], b: ["8D", "8S", "AC", "KC"] });
            game.addCardToTableTop("a", "7S");
            game.addCardToTableTop("a", "7D");
            game.coverCardOnTableTop("8D", 1);
            game.addCardToTableTop("a", "8C");
            game.finalisePlayerTurn("a");

            // Eights are on the table already, and the eight of clubs is still to beat.
            game.coverCardOnTableTop("8S", 0);
            expect(game.getPlayer("a").turned).toBe(false);
        });

        test("is asked again when another attacker adds a card", () => {
            const game = new Game(["a", "b", "c"], null, { ...DEFAULT_SETTINGS, randomisePlayerOrder: false });
            game.trump = cardFromString("2H");
            setUpRound(game, {
                hands: { a: ["7S", "QC"], b: ["8S", "9D", "AC"], c: ["7D", "KC"] },
                attacker: "a",
                defender: "b",
                deck: ["9C"],
            });
            game.addCardToTableTop("a", "7S");
            game.finalisePlayerTurn("a");
            game.addCardToTableTop("c", "7D");

            expect(game.getPlayer("a").turned).toBe(false);
        });

        test("ends the round with the last cover, when it brings no new rank", () => {
            const game = twoPlayers({ a: ["7S", "7D", "QC"], b: ["8S", "8D", "AC"] });
            game.addCardToTableTop("a", "7S");
            game.addCardToTableTop("a", "7D");
            game.finalisePlayerTurn("a");
            game.coverCardOnTableTop("8S", 0);
            game.finalisePlayerTurn("a");
            game.coverCardOnTableTop("8D", 1);

            expect(game.tableTop.size).toBe(0);
            expect(game.getDefendingPlayerName()).toBe("a");
        });
    });

    test("a defender who takes the cards can't beat them, or pass them on", () => {
        const game = new Game(["a", "b", "c"], null, { ...DEFAULT_SETTINGS, randomisePlayerOrder: false });
        game.trump = cardFromString("2H");
        setUpRound(game, {
            hands: { a: ["7S", "QC"], b: ["8S", "7D", "AC"], c: ["9C", "10C", "JC"] },
            attacker: "a",
            defender: "b",
            deck: ["9D"],
        });
        game.addCardToTableTop("a", "7S");
        game.finalisePlayerTurn("b");

        expect(() => game.coverCardOnTableTop("8S", 0)).toThrow("taking the cards");
        expect(() => game.addCardToTableTop("b", "7D")).toThrow("taking the cards");
    });
});
