import { describe, expect, test } from "bun:test";

import { range } from "./utils";

describe("range", () => {
    test("counts the positions from 0", () => {
        expect(range(4)).toEqual([0, 1, 2, 3]);
    });

    test("counts the positions from start up to end", () => {
        expect(range(3, 6)).toEqual([3, 4, 5]);
    });

    test("has no positions when there are none to count", () => {
        expect(range(0)).toEqual([]);
        expect(range(5, 3)).toEqual([]);
    });
});
