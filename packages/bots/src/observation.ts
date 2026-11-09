import { TableCard, movesOf, tableCards, turnOf } from "@durachok/engine";
import { Action, PlayerGameState, PlayerMove, expr, isDef, isSameMove } from "@durachok/transport";

/** What a player is told about the deck, unless the game is in mythic mode. */
export interface DeckState {
    /** How many cards are left in the deck to draw. */
    size: number;
    /** How many cards have been beaten, and put aside for the rest of the game. */
    discarded: number;
}

/**
 * What a bot knows when it decides a move, which is no more than its player is told: their
 * view of the game, the table and the deck in it, the moves that they can make, and what
 * has happened so far.
 */
export interface Observation {
    /** The player's view of the game: their hand, the other players, the table and the trump. */
    view: PlayerGameState;
    /** The cards on the table, in the order that they were played, each with the card that beat it, if any. */
    table: TableCard[];
    /** What's left of the deck, or null in mythic mode, where nobody is told. */
    deck: DeckState | null;
    /**
     * The moves that the player can make now, of which a strategy picks one. There are none
     * while they wait, as they do once they said that they're done attacking: they could still
     * add a card, but needn't, and the game asks them again when the table changes.
     */
    moves: PlayerMove[];
    /** What has happened in the game, in order, as the player was told. */
    history: Action[];
}

/**
 * What a player knows, from their view of the game and what they have seen happen in it.
 *
 * @param refused - Moves that the game refused since it last changed, which aren't offered again.
 */
export function observe(view: PlayerGameState, history: Action[], refused: PlayerMove[] = []): Observation {
    const deck = expr(() => {
        // A player in mythic mode isn't told the deck's size.
        if (!isDef(view.deckSize) || !isDef(view.discardSize)) {
            return null;
        }
        return { size: view.deckSize, discarded: view.discardSize };
    });
    const moves = expr(() => {
        // A player who said that they're done attacking makes no move, though they could still add a card.
        if (turnOf(view).kind === "attackDone") {
            return [];
        }
        return movesOf(view).filter((move) => !refused.some((other) => isSameMove(move, other)));
    });

    return { view, table: tableCards(view), deck, moves, history };
}
