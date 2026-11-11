import { GameResult } from "@durachok/engine";
import { Action } from "@durachok/transport";

/** One registered player's part in a finished game, which the statistics count from. */
export interface PlayerOutcome {
    /** The player's name in the game. */
    name: string;
    /** Whether the player owns the lobby that the game was played in. */
    owner: boolean;
    /** Whether the lobby's owner removed the player before the game finished, so that they didn't play it to the end. */
    removed: boolean;
    /** How the game came out: who won it, and who was the durak. */
    result: GameResult;
    /** How many rounds the game had. */
    rounds: number;
    /** Everything that happened in the game, for statistics, or achievements, about how it went. */
    history: Action[];
}

/** Which of a player's finished games a statistic counts, as achievements can say which they unlock in. */
export type OutcomeFilter = (outcome: PlayerOutcome) => boolean;
