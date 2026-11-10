import { describe, expect, test } from "bun:test";

import { readActions } from "./table";

const actors = { attacker: "katya", defender: "misha" };

/** The update of a round that a player ends by taking the cards on the table. */
const took = (player: string) =>
    readActions(
        [
            { type: "pickup", cards: ["6S", "7S"], player },
            { type: "new_round", actors },
        ],
        "me",
    );

describe("readActions", () => {
    test("for a spectator, every card is another player's, and taken cards go to the seat of whoever took them", () => {
        const update = readActions(
            [
                { type: "place", card: "6S", player: "katya" },
                { type: "cover", card: "7S", player: "misha", on: 0 },
            ],
            null,
        );
        expect(update.mine).toEqual([]);
        expect([...update.playedBy]).toEqual([
            ["6S", "katya"],
            ["7S", "misha"],
        ]);
        expect(readActions([{ type: "pickup", cards: ["6S"], player: "misha" }], null).clearTo).toEqual({
            to: "seat",
            player: "misha",
        });
    });

    test("tells the player's cards from the ones that others played, while the round goes on", () => {
        const update = readActions(
            [
                { type: "place", card: "6S", player: "me" },
                { type: "cover", card: "7S", player: "misha", on: 0 },
            ],
            "me",
        );
        expect(update.mine).toEqual(["6S"]);
        expect([...update.playedBy]).toEqual([["7S", "misha"]]);
        expect(update.clearTo).toBeNull();
        expect(update.newRound).toBe(false);
    });

    test("discards the table when a round ends with every card beaten", () => {
        const update = readActions(
            [
                { type: "forfeit", player: "katya" },
                { type: "new_round", actors },
            ],
            "me",
        );
        expect(update.clearTo).toEqual({ to: "discard" });
        expect(update.newRound).toBe(true);
    });

    test("sends the table to whoever took it", () => {
        expect(took("me").clearTo).toEqual({ to: "hand" });
        expect(took("misha").clearTo).toEqual({ to: "seat", player: "misha" });
        expect(took("misha").pickup?.cards).toEqual(["6S", "7S"]);
    });
});
