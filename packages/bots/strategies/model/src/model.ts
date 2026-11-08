import { Observation, Strategy } from "@durachok/bots";
import { PlayerMove } from "@durachok/transport";

/**
 * A model that decides which move a player makes, such as one trained on games, which a
 * bot asks through a `ModelStrategy`.
 */
export interface DecisionModel {
    /**
     * Pick a move.
     *
     * @returns The index of the move in `observation.moves`.
     */
    choose(observation: Observation, signal: AbortSignal): Promise<number>;
}

export interface ModelStrategyOptions {
    /** The strategy that decides when the model doesn't, because it failed or took too long. */
    fallback: Strategy;
    /** How long to wait for the model, in milliseconds. */
    timeoutMs?: number;
    /** Hears why the model didn't decide, e.g. to log it. */
    onFailure?: (error: unknown) => void;
}

/**
 * Asks a model which move to make. The model can only pick one of the moves that the player
 * can make, and when it fails, takes too long, or picks a move that isn't one of them, the
 * fallback decides instead, so that a slow or broken model never holds up the game.
 */
export class ModelStrategy implements Strategy {
    public constructor(
        private readonly model: DecisionModel,
        private readonly options: ModelStrategyOptions,
    ) {}

    public async decide(observation: Observation, signal: AbortSignal): Promise<PlayerMove> {
        const { fallback, timeoutMs = 2000, onFailure } = this.options;

        try {
            const index = await this.model.choose(
                observation,
                AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
            );
            const move = observation.moves[index];
            if (!move) {
                throw new Error(`The model picked move ${index}, out of ${observation.moves.length}`);
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
