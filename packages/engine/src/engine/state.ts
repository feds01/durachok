import { Card } from "./card";
import { History } from "./history";
import { Player } from "./player";

export class GameState {
    constructor(
        public readonly players: Map<string, Player>,
        public readonly tableTop: Map<string, string | null>,
        public readonly deck: string[],
        public readonly trump: Card,
        public readonly victory: boolean,
    ) {}
}

/**
 * The state of the player's deck, if its "visible", we know
 * all of the cards, if its "hidden", we only know the size of
 * the deck.
 */
export type PlayerDeckState =
    | {
          type: "visible";
          cards: string[];
      }
    | {
          type: "hidden";
          size: number;
      };

export type PlayerState = {
    /** The name of the player. */
    name: string;
    /** The deck of the player. */
    deck: PlayerDeckState;
    /** Whether the player has finished the game. */
    out: boolean;
    /** Whether the player has finished the round. */
    turned: boolean;
    /** Whether the player has started the round. */
    beganRound: boolean;
    /** What can the player do. */
    action: "attack" | "defend" | "none";
};

/** The state of the game for each player. */
export type PlayerGameState = {
    /**
     * The state of each player in the current game, from the
     * perspective of the current player. This is relevant because
     * this changes what the player "knows" about the game, i.e. what
     * cards other players have.
     */
    players: PlayerState[];
    /** The game history. */
    history?: History;
    /** The current state of the game. */
    tableTop: Record<string, string | null>;
    /** The size of the deck */
    deckSize: number;
    /** The trump card. */
    trump: Card;
};
