import { PlayerGameState, PlayerRole } from "@durachok/transport";
import { describe, expect, test } from "bun:test";

import { observe } from "../../observation";
import { RulesStrategy } from "./rules";

interface Seat {
    hand: string[];
    action: PlayerRole;
    /** The cards on the table, each with the card that beat it, if any. */
    table?: Record<string, string | null>;
    deckSize?: number;
}

/** A player's view of a game with hearts as trumps, against one other player who holds six cards. */
function viewOf({ hand, action, table = {}, deckSize = 10 }: Seat): PlayerGameState {
    return {
        player: { name: "bot", deck: hand, out: null, turned: false, beganRound: action === "attack", action },
        players: [
            {
                name: "other",
                deck: { type: "hidden", size: 6 },
                out: null,
                turned: false,
                beganRound: action !== "attack",
                action: action === "attack" ? "defend" : "attack",
            },
        ],
        tableTop: table,
        deckSize,
        discardSize: 0,
        trump: { suit: "H", card: "AH", value: 14 },
    };
}

const decide = (seat: Seat) => new RulesStrategy().decide(observe(viewOf(seat), []));

describe("The rules strategy", () => {
    test("leads with its lowest card that isn't a trump", () => {
        expect(decide({ hand: ["AS", "7H", "6D"], action: "attack" })).toEqual({ type: "place", card: "6D" });
    });

    test("adds a low card of a rank on the table", () => {
        expect(decide({ hand: ["KD", "8S"], action: "attack", table: { "6D": "8D" } })).toEqual({
            type: "place",
            card: "8S",
        });
    });

    test("is done attacking when it would only add a high card while the deck has cards", () => {
        expect(decide({ hand: ["QS"], action: "attack", table: { "6D": "QD" } })).toEqual({ type: "forfeit" });
        expect(decide({ hand: ["QS"], action: "attack", table: { "6D": "QD" }, deckSize: 0 })).toEqual({
            type: "place",
            card: "QS",
        });
    });

    test("beats a card with the cheapest card that does", () => {
        expect(decide({ hand: ["9S", "6H", "7S"], action: "defend", table: { "6S": null } })).toEqual({
            type: "cover",
            card: "7S",
            position: 0,
        });
    });

    test("passes the attack on with a card of the same rank that isn't a trump", () => {
        expect(decide({ hand: ["7S", "6D"], action: "defend", table: { "6S": null } })).toEqual({
            type: "place",
            card: "6D",
        });
    });

    test("takes the cards when it can't beat them all", () => {
        expect(decide({ hand: ["6D", "7C"], action: "defend", table: { AS: null } })).toEqual({ type: "forfeit" });
    });

    test("takes the cards rather than spend a high trump while the deck has cards", () => {
        expect(decide({ hand: ["KH"], action: "defend", table: { AS: null } })).toEqual({ type: "forfeit" });
        expect(decide({ hand: ["KH"], action: "defend", table: { AS: null }, deckSize: 0 })).toEqual({
            type: "cover",
            card: "KH",
            position: 0,
        });
    });
});
