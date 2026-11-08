import { Observation } from "@durachok/bots";
import { z } from "zod";

import { DecisionModel } from "./model";

/** What a model behind an HTTP endpoint answers with: the index of the move to make. */
const ChoiceSchema = z.object({ move: z.number().int() });

/**
 * A decision model behind an HTTP endpoint, which can be written in any language: the bot
 * POSTs the observation to it as JSON, `{ view, table, deck, moves, history }`, and it
 * answers `{ "move": <index> }`, the index of the move to make in `moves`.
 */
export class HttpModel implements DecisionModel {
    public constructor(private readonly url: string) {}

    public async choose(observation: Observation, signal: AbortSignal): Promise<number> {
        const response = await fetch(this.url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(observation),
            signal,
        });
        if (!response.ok) {
            throw new Error(`The model at ${this.url} answered ${response.status}`);
        }

        return ChoiceSchema.parse(await response.json()).move;
    }
}
