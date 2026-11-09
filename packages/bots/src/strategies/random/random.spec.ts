import { PlayerMove } from "@durachok/transport";
import { describe, expect, test } from "bun:test";

import { Observation } from "../../observation";
import { RandomStrategy } from "./random";

const moves: PlayerMove[] = [{ type: "place", card: "6S" }, { type: "place", card: "7S" }, { type: "forfeit" }];

/** An observation with only the moves in it, which is all that the random strategy looks at. */
const observation = { moves } as Observation;

describe("The random strategy", () => {
    test("makes one of the moves that it can, at random", () => {
        expect(new RandomStrategy(() => 0).decide(observation)).toEqual(moves[0]!);
        expect(new RandomStrategy(() => 0.5).decide(observation)).toEqual(moves[1]!);
        expect(new RandomStrategy(() => 0.99).decide(observation)).toEqual(moves[2]!);
    });
});
