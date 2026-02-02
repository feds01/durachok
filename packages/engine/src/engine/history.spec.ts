import { History } from "./history";
import { describe, expect, test } from "vitest";

describe("History sub-system tests", () => {
    describe("History", () => {
        test("should create a new game without crashing", () => {
            expect(() => new History([])).not.toThrow();
        });
    });
});
