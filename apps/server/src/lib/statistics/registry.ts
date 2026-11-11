import { games, total } from "./statistic";

/** Every statistic that the server keeps for a registered player. */
export const STATISTICS = [
    games(
        { id: "gamesPlayed", name: "Games played", description: "The games that the player played to the end." },
        ({ removed }) => !removed,
    ),
    games(
        { id: "gamesWon", name: "Games won", description: "The games in which the player went out first." },
        ({ name, result }) => result.winners.includes(name),
    ),
    games(
        {
            id: "gamesLost",
            name: "Games lost",
            description: "The games that the player lost as the durak, left holding cards.",
        },
        ({ name, result }) => result.durak === name,
    ),
    games(
        { id: "gamesHosted", name: "Games hosted", description: "The games played in a lobby that the player owns." },
        ({ owner }) => owner,
    ),
    total(
        {
            id: "roundsPlayed",
            name: "Rounds played",
            description: "The rounds in all of the games that the player played to the end.",
        },
        ({ removed, rounds }) => {
            if (removed) {
                return 0;
            }
            return rounds;
        },
    ),
    games(
        {
            id: "gamesResigned",
            name: "Games resigned",
            description: "The games that the player left before the end, when the lobby's owner removed them.",
        },
        ({ removed }) => removed,
    ),
] as const;

/** The id that a statistic is kept under, @see STATISTICS. */
export type StatisticId = (typeof STATISTICS)[number]["id"];

/** A player's statistics, as the server keeps them, @see STATISTICS. */
export type StoredStatistics = Record<StatisticId, number>;
