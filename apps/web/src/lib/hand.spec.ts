import { describe, expect, test } from "bun:test";

import { arrangeHand } from "./hand";

describe("arrangeHand", () => {
    test("keeps the sorted order until the player arranges the cards", () => {
        expect(arrangeHand(["6S", "7S", "QH"], null)).toEqual(["6S", "7S", "QH"]);
    });

    test("keeps the player's order, without the cards they played", () => {
        expect(arrangeHand(["6S", "QH"], ["QH", "7S", "6S"])).toEqual(["QH", "6S"]);
    });

    test("puts the cards that the player got since on the end, as sorted", () => {
        expect(arrangeHand(["6S", "7S", "8D", "QH", "AH"], ["QH", "6S"])).toEqual(["QH", "6S", "7S", "8D", "AH"]);
    });
});
