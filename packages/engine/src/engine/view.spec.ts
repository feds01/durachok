import { describe, expect, test } from "bun:test";

import { GamePlayer, OpaquePlayerState, PlayerGameState } from "@durachok/transport";

import { applyMove, canCover, canForfeit, canPlace, movesFor, tableCards, turnOf, visibleHands } from "./view";

/** A game between "me" and "them", with hearts as trumps, me attacking and them defending. */
function game(overrides: {
    me?: Partial<GamePlayer>;
    them?: Partial<OpaquePlayerState>;
    others?: OpaquePlayerState[];
    tableTop?: Record<string, string | null>;
}): PlayerGameState {
    return {
        player: {
            name: "me",
            deck: ["6S", "7S", "7C", "QD", "9H"],
            out: null,
            turned: false,
            beganRound: true,
            action: "attack",
            ...overrides.me,
        },
        players: [
            {
                name: "them",
                deck: { type: "hidden", size: 6 },
                out: null,
                turned: false,
                beganRound: false,
                action: "defend",
                ...overrides.them,
            },
            ...(overrides.others ?? []),
        ],
        tableTop: overrides.tableTop ?? {},
        deckSize: 20,
        discardSize: 0,
        trump: { suit: "H", card: "AH", value: 14 },
    };
}

const defending = { me: { action: "defend" as const, beganRound: false } };
const attacking = { them: { action: "attack" as const, beganRound: true } };

describe("placing a card", () => {
    test("the attacker leads with any card", () => {
        const state = game({});

        expect(["6S", "7S", "7C", "QD", "9H"].every((card) => canPlace(state, card))).toBe(true);
    });

    test("the attacker adds a rank that's on the table, beaten cards included", () => {
        const state = game({ tableTop: { "7D": "KD", "6C": null }, me: { deck: ["7S", "6S", "KC", "QD", "9H"] } });

        expect(canPlace(state, "7S")).toBe(true);
        expect(canPlace(state, "KC")).toBe(true);
        expect(canPlace(state, "6S")).toBe(true);
        expect(canPlace(state, "QD")).toBe(false);
        expect(canPlace(state, "9H")).toBe(false);
    });

    test("the attack can't hold more unbeaten cards than the defender holds", () => {
        const state = game({ tableTop: { "7D": null, "7H": null }, them: { deck: { type: "hidden", size: 2 } } });

        expect(canPlace(state, "7S")).toBe(false);
    });

    test("the table holds six attacks at most", () => {
        const tableTop = { "7D": "8D", "7H": "8H", "6C": "7C", "6D": "9D", "6H": "10H", "8S": "9S" };

        expect(canPlace(game({ tableTop }), "7S")).toBe(false);
    });

    test("a player who isn't attacking or defending can't place a card", () => {
        expect(canPlace(game({ me: { action: "none", beganRound: false } }), "6S")).toBe(false);
    });

    test("the defender passes the attack on with the rank on the table, before beating anything", () => {
        const state = game({ ...defending, ...attacking, tableTop: { "7D": null } });

        expect(canPlace(state, "7S")).toBe(true);
        expect(canPlace(state, "6S")).toBe(false);
        expect(canPlace(game({ ...defending, ...attacking, tableTop: { "7D": "8D" } }), "7S")).toBe(false);
        expect(canPlace(game({ ...defending, ...attacking, tableTop: { "7D": null, "8D": null } }), "7S")).toBe(false);
    });

    test("the attack only passes to a player who can beat it", () => {
        const tableTop = { "7D": null, "7H": null };

        expect(
            canPlace(
                game({ ...defending, them: { action: "attack", deck: { type: "hidden", size: 2 } }, tableTop }),
                "7S",
            ),
        ).toBe(false);
        expect(
            canPlace(
                game({ ...defending, them: { action: "attack", deck: { type: "hidden", size: 3 } }, tableTop }),
                "7S",
            ),
        ).toBe(true);
    });

    test("the attack passes over a player who is out", () => {
        const out: OpaquePlayerState = {
            ...game({}).players[0],
            name: "out",
            out: 1,
            deck: { type: "hidden", size: 0 },
        };
        const state = game({ ...defending, ...attacking, tableTop: { "7D": null } });

        expect(canPlace({ ...state, players: [out, ...state.players] }, "7S")).toBe(true);
    });
});

describe("beating a card", () => {
    const state = game({ ...defending, ...attacking, tableTop: { "6S": null, QS: null, "8H": null, "7D": "QD" } });

    test("a higher card of the same suit beats it", () => {
        expect(canCover(state, "7S", 0)).toBe(true);
        expect(canCover(state, "7S", 1)).toBe(false);
    });

    test("a trump beats a card that isn't one, and only a higher trump beats a trump", () => {
        expect(canCover(state, "9H", 1)).toBe(true);
        expect(canCover(state, "9H", 2)).toBe(true);
        expect(canCover(game({ ...defending, tableTop: { "10H": null } }), "9H", 0)).toBe(false);
    });

    test("a card of another suit doesn't beat it", () => {
        expect(canCover(state, "7C", 0)).toBe(false);
    });

    test("a beaten card can't be beaten again", () => {
        expect(canCover(state, "QD", 3)).toBe(false);
    });

    test("only the defender beats cards", () => {
        expect(canCover(game({ tableTop: { "6S": null } }), "7S", 0)).toBe(false);
    });

    test("a card's moves are every attack it beats, and passing the attack on", () => {
        const passing = game({
            ...defending,
            ...attacking,
            tableTop: { "6D": null },
            me: { action: "defend", deck: ["6H", "7D"] },
        });

        expect(movesFor(passing, "6H")).toEqual([
            { type: "place", card: "6H" },
            { type: "cover", card: "6H", position: 0 },
        ]);
        expect(movesFor(passing, "7D")).toEqual([{ type: "cover", card: "7D", position: 0 }]);
    });
});

describe("forfeiting", () => {
    test("an attacker can say they're done once a card is on the table", () => {
        expect(canForfeit(game({}))).toBe(false);
        expect(canForfeit(game({ tableTop: { "6D": null } }))).toBe(true);
        expect(canForfeit(game({ tableTop: { "6D": null }, me: { turned: true } }))).toBe(false);
    });

    test("the defender can take the cards while some are unbeaten", () => {
        expect(canForfeit(game({ ...defending, tableTop: { "6D": null } }))).toBe(true);
        expect(canForfeit(game({ ...defending, tableTop: { "6D": "7D" } }))).toBe(false);
    });
});

describe("the player's turn", () => {
    test("follows their role and the table", () => {
        expect(turnOf(game({}))).toEqual({ kind: "lead" });
        expect(turnOf(game({ tableTop: { "6D": null } }))).toEqual({ kind: "attack" });
        expect(turnOf(game({ tableTop: { "6D": null }, me: { turned: true } }))).toEqual({ kind: "attackDone" });
        expect(turnOf(game({ ...defending, tableTop: { "6D": null } }))).toEqual({ kind: "defend" });
        expect(turnOf(game({ ...defending, tableTop: { "6D": "7D" } }))).toEqual({ kind: "defended" });
        expect(
            turnOf(game({ ...defending, tableTop: { "6D": null }, me: { action: "defend", turned: true } })),
        ).toEqual({
            kind: "taking",
        });
        expect(turnOf(game({ me: { out: 1 } }))).toEqual({ kind: "out" });
    });

    test("a player who isn't in the round waits for its attacker and defender", () => {
        const attacker: OpaquePlayerState = {
            ...game({}).players[0],
            name: "attacker",
            action: "attack",
            beganRound: true,
        };

        expect(turnOf(game({ me: { action: "none", beganRound: false }, others: [attacker] }))).toEqual({
            kind: "wait",
            attacker: "attacker",
            defender: "them",
        });
    });
});

describe("a move before the server answers", () => {
    test("placing a card moves it from the hand to the end of the table", () => {
        const state = applyMove(game({ tableTop: { "7D": "8D" } }), { type: "place", card: "7S" });

        expect(state.player.deck).not.toContain("7S");
        expect(tableCards(state)).toEqual([
            { card: "7D", coveredBy: "8D" },
            { card: "7S", coveredBy: null },
        ]);
    });

    test("beating a card covers the card at its position", () => {
        const state = applyMove(game({ ...defending, tableTop: { "6S": null, "7D": null } }), {
            type: "cover",
            card: "QD",
            position: 1,
        });

        expect(tableCards(state)).toEqual([
            { card: "6S", coveredBy: null },
            { card: "7D", coveredBy: "QD" },
        ]);
        expect(state.player.deck).not.toContain("QD");
    });

    test("forfeiting marks the player as turned", () => {
        expect(applyMove(game({ tableTop: { "6D": null } }), { type: "forfeit" }).player.turned).toBe(true);
    });
});

describe("in mythic mode, without the other players' hand sizes", () => {
    const hidden = { deck: { type: "hidden" as const, size: null } };

    test("an attack is only limited by the table, and the game refuses one that the defender can't beat", () => {
        expect(canPlace(game({ them: hidden, tableTop: { "7D": null, "7H": null, "7C": null } }), "7S")).toBe(true);

        const tableTop = { "7D": "8D", "7H": "8H", "6C": "7C", "6D": "9D", "6H": "10H", "8S": "9S" };
        expect(canPlace(game({ them: hidden, tableTop }), "7S")).toBe(false);
    });

    test("the attack can be passed on to a player whose hand size isn't told", () => {
        expect(
            canPlace(game({ ...defending, them: { ...hidden, action: "attack" }, tableTop: { "7D": null } }), "7S"),
        ).toBe(true);
    });
});

describe("a defender who takes the cards", () => {
    test("can't beat them, or pass them on", () => {
        const taking = game({
            me: { action: "defend", beganRound: false, turned: true },
            ...attacking,
            tableTop: { "7D": null },
        });

        expect(canCover(taking, "QD", 0)).toBe(false);
        expect(canPlace(taking, "7S")).toBe(false);
    });
});

/** A hand whose cards the player sees. */
const shown = (cards: string[]) => ({ type: "visible" as const, cards });

describe("the hands that a player can see", () => {
    const out = { me: { out: 1, deck: [], action: "none" as const } };

    test("none while the player is still in the game", () => {
        expect(visibleHands(game({}))).toEqual([]);
    });

    test("everyone's still in the game once the player is out, each sorted with the trumps last", () => {
        const state = game({
            ...out,
            them: { deck: shown(["9H", "6S", "QD"]) },
            others: [
                { name: "gone", deck: shown([]), out: 2, turned: false, beganRound: false, action: "none" },
                { name: "third", deck: shown(["7C"]), out: null, turned: false, beganRound: false, action: "attack" },
            ],
        });

        expect(visibleHands(state)).toEqual([
            { name: "them", cards: ["6S", "QD", "9H"] },
            { name: "third", cards: ["7C"] },
        ]);
        expect(visibleHands(state, "third").map(({ name }) => name)).toEqual(["third", "them"]);
    });
});
