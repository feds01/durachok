import {generateCardDeck, parseCard} from "./card";


describe("Card tests", () => {
    describe("parseCard", () => {
        test("Parse a simple card", () => {
            const expected = [
                {value: 4, suit: "D", card: "4D"},
                {value: 14, suit: "S", card: "AS"},
            ];

            expect(parseCard("4D")).toEqual(expected[0]);
            expect(parseCard("AS")).toEqual(expected[1])
        });

        test("parseCard should throw on invalid numeric", () => {
            expect(() => parseCard("1D")).toThrow();
        });

        test("parseCard should throw on invalid suit", () => {
            expect(() => parseCard("2B")).toThrow();
        });
    });

    describe("generateCardDeck", () => {
        test("generateCardDeck should generate correct deck", () => {
            const deck = [
                '2H', '2D', '2C', '2S', '3H', '3D', '3C',
                '3S', '4H', '4D', '4C', '4S', '5H', '5D',
                '5C', '5S', '6H', '6D', '6C', '6S', '7H',
                '7D', '7C', '7S', '8H', '8D', '8C', '8S',
                '9H', '9D', '9C', '9S', '10H', '10D', '10C',
                '10S', 'JH', 'JD', 'JC', 'JS', 'QH', 'QD',
                'QC', 'QS', 'KH', 'KD', 'KC', 'KS', 'AH',
                'AD', 'AC', 'AS'
            ];

            const shortDeck = [
                '6H', '6D', '6C', '6S', '7H',
                '7D', '7C', '7S', '8H', '8D',
                '8C', '8S', '9H', '9D', '9C',
                '9S', '10H', '10D', '10C', '10S',
                'JH', 'JD', 'JC', 'JS', 'QH',
                'QD', 'QC', 'QS', 'KH', 'KD',
                'KC', 'KS', 'AH', 'AD', 'AC',
                'AS'
            ];

            expect(generateCardDeck()).toEqual(deck);
            expect(generateCardDeck(true)).toEqual(shortDeck);
        });
    });
});
