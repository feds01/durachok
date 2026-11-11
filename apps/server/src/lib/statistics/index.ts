import { UserStatistics } from "@durachok/transport";

import { PlayerOutcome } from "./outcome";
import { STATISTICS, StoredStatistics } from "./registry";

/*
 * The statistics that the server keeps for each registered player: what a player's part in a
 * finished game is, @see PlayerOutcome, what a statistic is, @see Statistic, and every one of
 * them, in the registry, @see STATISTICS.
 */

export type { OutcomeFilter, PlayerOutcome } from "./outcome";
export type { Statistic, StatisticInfo } from "./statistic";
export { STATISTICS, type StatisticId, type StoredStatistics } from "./registry";

/** What a finished game adds to a player's statistics: only the ones that it changes. */
export function countOutcome(outcome: PlayerOutcome): Partial<StoredStatistics> {
    return Object.fromEntries(
        STATISTICS.flatMap(({ id, amount }) => {
            const added = amount(outcome);
            if (added === 0) {
                return [];
            }
            return [[id, added]];
        }),
    );
}

/** A player's statistics, as the server keeps them, as the player is sent them. */
export function toUserStatistics(stored: StoredStatistics): UserStatistics {
    const { gamesPlayed, gamesWon, gamesLost, gamesHosted, gamesResigned, roundsPlayed } = stored;
    return {
        gamesPlayed,
        gamesWon,
        gamesLost,
        gamesHosted,
        gamesResigned,
        averageRounds: gamesPlayed === 0 ? 0 : roundsPlayed / gamesPlayed,
    };
}
