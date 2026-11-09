import { PlayerMove } from "@durachok/transport";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, test } from "bun:test";

import { Observation } from "../../observation";
import { Strategy } from "../../strategy";
import { ModelStrategy } from "./model";

const moves: PlayerMove[] = [{ type: "place", card: "6S" }, { type: "place", card: "7S" }, { type: "forfeit" }];
const observation = { moves } as Observation;

/** A fallback that always gives up the round, so that a test can tell when it decided. */
const fallback: Strategy = { decide: () => ({ type: "forfeit" }) };

/** A model that answers with a choice, after a delay, unless the call is called off, as a request would be. */
function model(answer: string, delayMs = 0) {
    return new MockLanguageModelV4({
        doGenerate: async ({ abortSignal }) => {
            await new Promise<void>((resolve, reject) => {
                if (abortSignal?.aborted) {
                    reject(abortSignal.reason);
                    return;
                }
                const timer = setTimeout(resolve, delayMs);
                abortSignal?.addEventListener("abort", () => {
                    clearTimeout(timer);
                    reject(abortSignal.reason);
                });
            });
            return {
                content: [{ type: "text", text: JSON.stringify({ result: answer }) }],
                finishReason: { unified: "stop", raw: undefined },
                usage: {
                    inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
                    outputTokens: { total: 1, text: 1, reasoning: undefined },
                },
                warnings: [],
            };
        },
    });
}

const failing = new MockLanguageModelV4({ doGenerate: () => Promise.reject(new Error("The model is down")) });
const signal = () => new AbortController().signal;

describe("The model strategy", () => {
    test("makes the move that the model picks, out of the moves that the player can make", async () => {
        const picking = model(JSON.stringify(moves[1]));
        const move = await new ModelStrategy({ model: picking, fallback }).decide(observation, signal());

        expect(move).toEqual({ type: "place", card: "7S" });
        const { responseFormat } = picking.doGenerateCalls[0]!;
        expect(responseFormat?.type === "json" && responseFormat.schema).toMatchObject({
            properties: { result: { enum: moves.map((offered) => JSON.stringify(offered)) } },
        });
    });

    test("leaves the move to the fallback when the model fails, picks a move that isn't there, or is too slow", async () => {
        const failures: unknown[] = [];
        const options = { fallback, timeoutMs: 20, onFailure: (error: unknown) => failures.push(error) };
        const decide = (answering: MockLanguageModelV4) =>
            new ModelStrategy({ ...options, model: answering }).decide(observation, signal());

        expect(await decide(failing)).toEqual({ type: "forfeit" });
        expect(await decide(model("castle"))).toEqual({ type: "forfeit" });
        expect(await decide(model(JSON.stringify(moves[0]), 1000))).toEqual({ type: "forfeit" });
        expect(failures).toHaveLength(3);
    });

    test("gives up, rather than fall back, once the decision is no longer wanted", async () => {
        const controller = new AbortController();
        const strategy = new ModelStrategy({ model: model(JSON.stringify(moves[0]), 1000), fallback });
        const deciding = strategy.decide(observation, controller.signal);
        controller.abort();

        await expect(deciding).rejects.toBeDefined();
    });
});
