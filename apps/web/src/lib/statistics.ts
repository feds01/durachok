import { UserStatistics } from "@durachok/transport";

/** One of a player's statistics, as their dashboard shows it. */
export interface StatisticTile {
    label: string;
    value: string;
}

const NUMBER = new Intl.NumberFormat("en-GB");

/**
 * A player's statistics, as their dashboard shows them: the games that they finished, the ones
 * that they won by going out first, and the ones that they lost as the durak.
 */
export function statisticTiles({ gamesPlayed, gamesWon, gamesLost }: UserStatistics): StatisticTile[] {
    return [
        { label: "Played", value: NUMBER.format(gamesPlayed) },
        { label: "Won", value: NUMBER.format(gamesWon) },
        { label: "Durak", value: NUMBER.format(gamesLost) },
    ];
}
