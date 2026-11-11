import { UserStatistics } from "@durachok/transport";

/** One of a player's statistics, as their dashboard shows it. */
export interface StatisticTile {
    label: string;
    value: string;
}

const COUNT = new Intl.NumberFormat("en-GB");
const AVERAGE = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/**
 * A player's statistics, as their dashboard shows them: the games that they finished, the ones
 * that they won by going out first, the ones that they lost as the durak, the ones that they
 * hosted, the ones that the owner removed them from, and how many rounds their games had on average.
 */
export function statisticTiles({
    gamesPlayed,
    gamesWon,
    gamesLost,
    gamesHosted,
    gamesResigned,
    averageRounds,
}: UserStatistics): StatisticTile[] {
    return [
        { label: "Played", value: COUNT.format(gamesPlayed) },
        { label: "Won", value: COUNT.format(gamesWon) },
        { label: "Durak", value: COUNT.format(gamesLost) },
        { label: "Hosted", value: COUNT.format(gamesHosted) },
        { label: "Removed", value: COUNT.format(gamesResigned) },
        { label: "Rounds a game", value: AVERAGE.format(averageRounds) },
    ];
}
