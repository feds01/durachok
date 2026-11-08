import { describe, expect, test } from "bun:test";

import { readActions } from "./table";

const actors = { attacker: "katya", defender: "misha" };

describe("readActions", () => {
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
        const took = (player: string) =>
            readActions(
                [
                    { type: "pickup", cards: ["6S", "7S"], player },
                    { type: "new_round", actors },
                ],
                "me",
            );
        expect(took("me").clearTo).toEqual({ to: "hand" });
        expect(took("misha").clearTo).toEqual({ to: "seat", player: "misha" });
        expect(took("misha").pickup?.cards).toEqual(["6S", "7S"]);
    });
});
