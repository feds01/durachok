import { describe, expect, test } from "bun:test";

import { drawnSince } from "./deal";

describe("drawnSince", () => {
    test("counts every card as drawn when a player wasn't counted before, as at the deal", () => {
        expect(drawnSince({}, [{ name: "misha", size: 6 }], null)).toEqual([{ name: "misha", count: 6 }]);
    });

    test("counts the cards that a player drew since the last update", () => {
        expect(
            drawnSince(
                { misha: 3, katya: 6 },
                [
                    { name: "misha", size: 6 },
                    { name: "katya", size: 6 },
                ],
                null,
            ),
        ).toEqual([{ name: "misha", count: 3 }]);
    });

    test("leaves out the cards that a player took from the table", () => {
        const pickup = { type: "pickup" as const, player: "misha", cards: ["6S", "7S"] };
        expect(drawnSince({ misha: 4 }, [{ name: "misha", size: 6 }], pickup)).toEqual([]);
        expect(drawnSince({ misha: 2 }, [{ name: "misha", size: 6 }], pickup)).toEqual([{ name: "misha", count: 2 }]);
    });

    test("counts nothing for a player who played cards", () => {
        expect(drawnSince({ misha: 6 }, [{ name: "misha", size: 5 }], null)).toEqual([]);
    });

    test("counts nothing for a hand whose size isn't told, before or after", () => {
        expect(drawnSince({}, [{ name: "misha", size: null }], null)).toEqual([]);
        // A player who goes out in mythic mode is shown everyone's cards, which they didn't draw.
        expect(drawnSince({ misha: null }, [{ name: "misha", size: 4 }], null)).toEqual([]);
    });
});
