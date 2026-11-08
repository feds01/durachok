import { PlayerMove } from "@durachok/transport";

import { Observation } from "./observation";

/**
 * How a bot decides its moves, which is up to the bot: the rest of the system only sees the
 * moves that it makes, as it would a person's.
 */
export interface Strategy {
    /**
     * Decide a move, out of the ones that the player can make now, of which there is always
     * at least one.
     *
     * @param signal - Aborted once the game has moved on, and the decision is no longer wanted.
     * @returns One of the observation's moves.
     */
    decide(observation: Observation, signal: AbortSignal): PlayerMove | Promise<PlayerMove>;
}
