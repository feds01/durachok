export class Player {
    deck: string[];
    canAttack: boolean;
    turned: boolean;
    out: number | null | "resigned";
    isDefending: boolean;
    beganRound: boolean;


    constructor(deck: string[] = [], canAttack: boolean = false,
                beganRound: boolean = false,
                turned: boolean = false,
                out: number | null = null,
                isDefending: boolean = false,
    ) {
        this.deck = deck;
        this.beganRound = beganRound;
        this.canAttack = canAttack;
        this.turned = turned;
        this.out = out;
        this.isDefending = isDefending;

    }

    addCard(card: string): void {
        this.deck.push(card);
    }

}
