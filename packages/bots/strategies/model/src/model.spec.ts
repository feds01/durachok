import { Observation, Strategy } from "@durachok/bots";
import { PlayerMove } from "@durachok/transport";
import { afterEach, describe, expect, test } from "bun:test";

import { HttpModel } from "./http";
import { DecisionModel, ModelStrategy } from "./model";

const moves: PlayerMove[] = [{ type: "place", card: "6S" }, { type: "place", card: "7S" }, { type: "forfeit" }];
const observation = { moves } as Observation;

/** A fallback that always gives up the round, so that a test can tell when it decided. */
const fallback: Strategy = { decide: () => ({ type: "forfeit" }) };

/** A model that picks a move by its index, after a delay, unless it's told to stop. */
function model(index: number, delayMs = 0): DecisionModel {
    return {
        choose: (_, signal) =>
            new Promise((resolve, reject) => {
                const timer = setTimeout(() => resolve(index), delayMs);
                signal.addEventListener("abort", () => {
                    clearTimeout(timer);
                    reject(signal.reason);
                });
            }),
    };
}

const failing: DecisionModel = { choose: () => Promise.reject(new Error("The model is down")) };
const signal = () => new AbortController().signal;

describe("The model strategy", () => {
    test("makes the move that the model picks", async () => {
        const strategy = new ModelStrategy(model(1), { fallback });
        expect(await strategy.decide(observation, signal())).toEqual({ type: "place", card: "7S" });
    });

    test("leaves the move to the fallback when the model fails, picks a move that isn't there, or is too slow", async () => {
        const failures: unknown[] = [];
        const options = { fallback, timeoutMs: 20, onFailure: (error: unknown) => failures.push(error) };

        expect(await new ModelStrategy(failing, options).decide(observation, signal())).toEqual({ type: "forfeit" });
        expect(await new ModelStrategy(model(7), options).decide(observation, signal())).toEqual({ type: "forfeit" });
        expect(await new ModelStrategy(model(0, 1000), options).decide(observation, signal())).toEqual({
            type: "forfeit",
        });
        expect(failures).toHaveLength(3);
    });

    test("gives up, rather than fall back, once the decision is no longer wanted", async () => {
        const controller = new AbortController();
        const deciding = new ModelStrategy(model(0, 1000), { fallback }).decide(observation, controller.signal);
        controller.abort();

        await expect(deciding).rejects.toBeDefined();
    });
});

describe("A model behind an HTTP endpoint", () => {
    let server: ReturnType<typeof Bun.serve> | undefined;
    afterEach(() => server?.stop(true));

    test("is sent the observation, and answers with the index of a move", async () => {
        let received: unknown;
        server = Bun.serve({
            port: 0,
            fetch: async (request) => {
                received = await request.json();
                return Response.json({ move: 2 });
            },
        });

        const index = await new HttpModel(server.url.href).choose(observation, signal());

        expect(index).toBe(2);
        expect(received).toEqual({ moves });
    });

    test("fails when the endpoint does", async () => {
        server = Bun.serve({ port: 0, fetch: () => new Response("no", { status: 500 }) });

        await expect(new HttpModel(server.url.href).choose(observation, signal())).rejects.toThrow("answered 500");
    });
});
