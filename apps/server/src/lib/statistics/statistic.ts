import { OutcomeFilter, PlayerOutcome } from "./outcome";

/** What a statistic is: the id that it's kept under, and what it's called and counts, for people to read. */
export interface StatisticInfo<Id extends string = string> {
    /** The name that the statistic is kept under. */
    id: Id;
    /** What the statistic is called. */
    name: string;
    /** What the statistic counts, in a sentence. */
    description: string;
}

/** A statistic that each finished game adds to, by how much it says for the player. */
export interface Statistic<Id extends string = string> extends StatisticInfo<Id> {
    amount: (outcome: PlayerOutcome) => number;
}

/** A statistic that counts the games that pass the filter. */
export function games<Id extends string>(info: StatisticInfo<Id>, filter: OutcomeFilter): Statistic<Id> {
    return { ...info, amount: (outcome) => (filter(outcome) ? 1 : 0) };
}

/** A statistic that adds up an amount over the games. */
export function total<Id extends string>(
    info: StatisticInfo<Id>,
    amount: (outcome: PlayerOutcome) => number,
): Statistic<Id> {
    return { ...info, amount };
}
