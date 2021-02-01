export type UserStatisticsType =  {
    gamesPlayed: {name: string, value: number},
    gamesHosted: {name: string, value: number},
    gamesResigned: {name: string, value: number},
    gamesWon: {name: string, value: number},
    gamesLost: {name: string, value: number},
    averageRounds: {name: string, value: number},
}


export const defaultStatistics: UserStatisticsType = {
    gamesPlayed: {name: "Games Played", value: 0},
    gamesHosted: {name: "Games Hosted", value: 0},
    gamesResigned: {name: "Games Resigned", value: 0},
    gamesWon: {name: "Games Won", value: 0},
    gamesLost: {name: "Games Lost", value: 0},
    averageRounds: {name: "Average Rounds", value: 0}
};
