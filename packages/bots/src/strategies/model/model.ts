import { PlayerMove } from "@durachok/transport";
import { LanguageModel, Output, generateText } from "ai";

import { Observation } from "../../observation";
import { Strategy } from "../../strategy";

export interface ModelStrategyOptions {
    /**
     * The language model that decides, from any provider: a model, or the id of one on the AI
     * Gateway, such as `anthropic/claude-haiku-5.5`.
     */
    model: LanguageModel;
    /** The strategy that decides when the model doesn't, because it failed or took too long. */
    fallback: Strategy;
    /** How long to wait for the model, in milliseconds. */
    timeoutMs?: number;
    /** Hears why the model didn't decide, e.g. to log it. */
    onFailure?: (error: unknown) => void;
}

/** What the model is told about the game, and about the moves that it picks from. */
const INSTRUCTIONS = `You play Durak, the card game, as one of its players. You are shown the game as your player sees it, as JSON: your hand, the other players, the cards on the table, each with the card that covers it, the trump, the deck, and what has happened so far.

Pick the move that gives your player the best chance of not being the last one left holding cards. Each move is offered as JSON:
- {"type":"place","card":…}: put a card on the table, to attack, or as the defender to pass the attack on.
- {"type":"cover","position":…,"card":…}: beat the card at that place on the table with this one.
- {"type":"forfeit"}: as the defender, take the cards on the table; as an attacker, say that you're done.`;

/**
 * Asks a language model which move to make, out of the moves that the player can make, so that
 * it can't pick one that isn't. When the model fails or takes too long, the fallback decides
 * instead, so that a slow or broken model never holds up the game.
 */
export class ModelStrategy implements Strategy {
    public constructor(private readonly options: ModelStrategyOptions) {}

    public async decide(observation: Observation, signal: AbortSignal): Promise<PlayerMove> {
        const { model, fallback, timeoutMs = 10_000, onFailure } = this.options;
        // The moves as the model is offered them, by their JSON.
        const offered = new Map(observation.moves.map((move) => [JSON.stringify(move), move]));
        const { moves: _, ...game } = observation;

        try {
            const { output } = await generateText({
                model,
                instructions: INSTRUCTIONS,
                prompt: JSON.stringify(game),
                output: Output.choice({ options: [...offered.keys()] }),
                abortSignal: signal,
                timeout: timeoutMs,
            });
            const move = offered.get(output);
            if (!move) {
                throw new Error(`The model picked ${output}, which isn't one of the moves`);
            }
            return move;
        } catch (error: unknown) {
            // The game moved on, and nobody wants the decision any more.
            if (signal.aborted) {
                throw error;
            }

            onFailure?.(error);
            return fallback.decide(observation, signal);
        }
    }
}
