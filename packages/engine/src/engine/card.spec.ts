import { cardFromString, cardName, generateCardDeck, isRedSuit, sortHand, suitSymbol } from "./card";
import { describe, expect, test } from "bun:test";

describe("Card tests", () => {
    describe("cardFromString", () => {
        test("Parse a simple card", () => {
            const expected = [
                { value: 4, suit: "D", card: "4D" },
                { value: 14, suit: "S", card: "AS" },
            ];

            expect(cardFromString("4D")).toEqual(expected[0]);
            expect(cardFromString("AS")).toEqual(expected[1]);
        });

        test("cardFromString should throw on invalid numeric", () => {
            expect(() => cardFromString("1D")).toThrow();
        });

        test("cardFromString should throw on invalid suit", () => {
            expect(() => cardFromString("2B")).toThrow();
        });
    });

    describe("generateCardDeck", () => {
        test("generateCardDeck should generate correct deck", () => {
            const deck = [
                "2H",
                "2D",
                "2C",
                "2S",
                "3H",
                "3D",
                "3C",
                "3S",
                "4H",
                "4D",
                "4C",
                "4S",
                "5H",
                "5D",
                "5C",
                "5S",
                "6H",
                "6D",
                "6C",
                "6S",
                "7H",
                "7D",
                "7C",
                "7S",
                "8H",
                "8D",
                "8C",
                "8S",
                "9H",
                "9D",
                "9C",
                "9S",
                "10H",
                "10D",
                "10C",
                "10S",
                "JH",
                "JD",
                "JC",
                "JS",
                "QH",
                "QD",
                "QC",
                "QS",
                "KH",
                "KD",
                "KC",
                "KS",
                "AH",
                "AD",
                "AC",
                "AS",
            ];

            const shortDeck = [
                "6H",
                "6D",
                "6C",
                "6S",
                "7H",
                "7D",
                "7C",
                "7S",
                "8H",
                "8D",
                "8C",
                "8S",
                "9H",
                "9D",
                "9C",
                "9S",
                "10H",
                "10D",
                "10C",
                "10S",
                "JH",
                "JD",
                "JC",
                "JS",
                "QH",
                "QD",
                "QC",
                "QS",
                "KH",
                "KD",
                "KC",
                "KS",
                "AH",
                "AD",
                "AC",
                "AS",
            ];

            expect(generateCardDeck()).toEqual(deck);
            expect(generateCardDeck(true)).toEqual(shortDeck);
        });
    });

    describe("a card for a player", () => {
        test("is named in words", () => {
            expect(cardName("QH")).toBe("queen of hearts");
            expect(cardName("10S")).toBe("10 of spades");
            expect(cardName("AD")).toBe("ace of diamonds");
        });

        test("has a filled suit symbol, red for hearts and diamonds", () => {
            expect(suitSymbol("C")).toBe("♣");
            expect(["H", "D", "C", "S"].map(isRedSuit)).toEqual([true, true, false, false]);
        });

        test("sits in a hand by suit, with the trumps last, each low to high", () => {
            expect(sortHand(["AH", "7S", "2H", "QC", "6S", "10D"], "S")).toEqual(["2H", "AH", "QC", "10D", "6S", "7S"]);
        });
    });
});
