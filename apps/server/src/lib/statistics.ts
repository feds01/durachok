import { GameResult } from "@durachok/engine";
import { Action, UserStatistics } from "@durachok/transport";

/** One registered player's part in a finished game, which the statistics count from. */
export interface PlayerOutcome {
    /** The player's name in the game. */
    name: string;
    /** Whether the player owns the lobby that the game was played in. */
    owner: boolean;
    /** How the game came out: who won it, and who was the durak. */
    result: GameResult;
    /** How many rounds the game had. */
    rounds: number;
    /** Everything that happened in the game, for statistics, or achievements, about how it went. */
    history: Action[];
}

/** Which of a player's finished games a statistic counts, as achievements can say which they unlock in. */
export type OutcomeFilter = (outcome: PlayerOutcome) => boolean;

/** A statistic that each finished game adds to, by how much it says for the player. */
export interface Statistic {
    amount: (outcome: PlayerOutcome) => number;
}

/** A statistic that counts the games that pass the filter. */
function games(filter: OutcomeFilter): Statistic {
    return { amount: (outcome) => (filter(outcome) ? 1 : 0) };
}

/** A statistic that adds up an amount over the games. */
function total(amount: (outcome: PlayerOutcome) => number): Statistic {
    return { amount };
}

/** Every statistic that the server keeps for a registered player, by the name that it's kept under. */
export const STATISTICS = {
    gamesPlayed: games(() => true),
    gamesWon: games(({ name, result }) => result.winners.includes(name)),
    gamesLost: games(({ name, result }) => result.durak === name),
    gamesHosted: games(({ owner }) => owner),
    roundsPlayed: total(({ rounds }) => rounds),
} satisfies Record<string, Statistic>;

/** The name that a statistic is kept under, @see STATISTICS. */
export type StatisticName = keyof typeof STATISTICS;

/** A player's statistics, as the server keeps them, @see STATISTICS. */
export type StoredStatistics = Record<StatisticName, number>;

/** The names of the statistics, in the order that they're defined. */
export const STATISTIC_NAMES = Object.keys(STATISTICS) as StatisticName[];

/** What a finished game adds to a player's statistics: only the ones that it changes. */
export function countOutcome(outcome: PlayerOutcome): Partial<StoredStatistics> {
    return Object.fromEntries(
        STATISTIC_NAMES.flatMap((name) => {
            const amount = STATISTICS[name].amount(outcome);
            return amount === 0 ? [] : [[name, amount]];
        }),
    );
}

/** A player's statistics, as the server keeps them, as the player is sent them. */
export function toUserStatistics(stored: StoredStatistics): UserStatistics {
    const { gamesPlayed, gamesWon, gamesLost, gamesHosted, roundsPlayed } = stored;
    return {
        gamesPlayed,
        gamesWon,
        gamesLost,
        gamesHosted,
        averageRounds: gamesPlayed === 0 ? 0 : roundsPlayed / gamesPlayed,
    };
}
