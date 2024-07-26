export type PlayerActon = "attack" | "defend" | "none";

export class Player {
    deck: string[];

    /** Whether the player has finished the game. */
    out?: number;

    /** Whether the player has finished the current round. */
    turned: boolean;

    /** Whether the player has started the round. */
    beganRound: boolean;

    /** What can the player do. */
    action: PlayerActon;

    constructor(
        deck: string[] = [],
        beganRound: boolean = false,
        turned: boolean = false,
        action: PlayerActon = "none",
        out?: number,
    ) {
        this.deck = deck;
        this.beganRound = beganRound;
        this.turned = turned;
        this.action = action;
        this.out = out;
    }

    /** Add a card to the current player. */
    public addCard(card: string) {
        this.deck.push(card);
    }
}
