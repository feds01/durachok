import { CardNumerics, CardSuits } from "./consts";

export class Card {
    /**
     * The value of the card.
     * */
    value: number;

    /**
     * The suit of the card.
     * */
    suit: string;

    /**
     * The card string.
     * */
    card: string;

    public constructor(value: number, suit: string, card: string) {
        this.value = value;
        this.suit = suit;
        this.card = card;
    }

    /**
     * Converts the card to a string.
     *
     * @param card The card to be converted to a string.
     *
     * @throws Error if the card is invalid.
     *
     * @returns a Card object.
     */
    static fromString(card: string): Card {
        const suit = card.substring(card.length - 1);
        const rawNumeric = card.substring(0, card.length - 1);

        if (!Object.keys(CardSuits).includes(suit)) {
            throw new Error("Invalid card suit.");
        }

        if (!CardNumerics.includes(rawNumeric)) {
            throw new Error("Invalid card numeric.");
        }

        return new Card(CardNumerics.indexOf(rawNumeric) + 2, suit, card);
    }
}

/**
 * Generates a whole card deck for use in the format of a list. Each
 * element follows the format of '(label)(suit)'.
 *
 * @param {boolean} short - Whether the deck is short or not
 * */
export function generateCardDeck(short = false): string[] {
    return CardNumerics.slice(short ? 4 : 0, CardNumerics.length)
        .map((label) => {
            return Object.keys(CardSuits).map((suit) => {
                return `${label}${suit}`;
            });
        })
        .flat();
}
