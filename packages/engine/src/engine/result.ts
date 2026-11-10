import { GamePlayer } from "@durachok/transport";

/** How a game came out: who won it, by going out first, and the durak, who was left holding cards. */
export interface GameResult {
    /** The players who went out first: more than one, if they went out in the same round. */
    winners: string[];
    /** The player left with cards, or nothing, if the last of them went out together. */
    durak: string | null;
}

/** How a finished game came out, from when each of its players went out, @see GameResult. */
export function gameResult(players: Iterable<Pick<GamePlayer, "name" | "out">>): GameResult {
    const all = Array.from(players);
    const outs = all.flatMap(({ out }) => (out === null ? [] : [out]));
    const first = Math.min(...outs);

    return {
        winners: all.filter(({ out }) => out === first).map(({ name }) => name),
        durak: all.find(({ out }) => out === null)?.name ?? null,
    };
}
