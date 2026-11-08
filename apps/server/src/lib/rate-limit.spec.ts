import { describe, expect, test } from "bun:test";

import { RateLimiter } from "./rate-limit";

/** A limiter of 3 actions a second, on a clock that the test moves. */
function limiter() {
    const clock = { now: 0 };
    return { clock, limits: new RateLimiter(3, 1000, () => clock.now) };
}

describe("A rate limiter", () => {
    test("lets a key act up to the limit within the window, and again once the window moves on", () => {
        const { clock, limits } = limiter();

        expect([1, 2, 3, 4].map(() => limits.take("a"))).toEqual([true, true, true, false]);

        clock.now = 999;
        expect(limits.take("a")).toBe(false);
        clock.now = 1000;
        expect(limits.take("a")).toBe(true);
    });

    test("counts each key apart", () => {
        const { limits } = limiter();
        [1, 2, 3].forEach(() => limits.take("a"));

        expect(limits.isLimited("a")).toBe(true);
        expect(limits.take("b")).toBe(true);
    });

    test("counts failures without refusing them, and asks without counting", () => {
        const { limits } = limiter();

        expect(limits.isLimited("a")).toBe(false);
        [1, 2, 3, 4, 5].forEach(() => limits.hit("a"));
        expect(limits.isLimited("a")).toBe(true);
    });

    test("forgets the keys that went quiet", () => {
        const { clock, limits } = limiter();
        ["a", "b", "c"].forEach((key) => limits.take(key));

        clock.now = 1500;
        limits.take("d");
        expect(limits.size).toBe(1);
    });
});
