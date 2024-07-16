import {CardNumerics, CardSuits} from "./consts";

export interface CardType {
    value: number,
    suit: string
    card: string,
}

/**
 * Simple function to split the card string into it's 'numerical'
 * value and it's 'suit' value.
 *
 * @param {string} card String representing card which is to be parsed.
 * @return {CardType} The numerical and suit component of the card.
 * */
export function parseCard(card: string): CardType {

    // ensure the numeric and suit are valid
    const suit = card.substring(card.length - 1);
    const rawNumeric = card.substring(0, card.length - 1);

    if (!Object.keys(CardSuits).includes(suit)) {
        throw new Error("Invalid card suit.");
    }

    if (!CardNumerics.includes(rawNumeric)) {
        throw new Error("Invalid card numeric.")
    }

    return {value: CardNumerics.indexOf(rawNumeric) + 2, suit, card};
}



/**
 * Generates a whole card deck for use in the format of a list. Each
 * element follows the format of '(label)(suit)'.
 *
 * @param {boolean} short - Whether the deck is short or not
 * */
export function generateCardDeck(short: boolean = false): string[] {
    return CardNumerics.slice(short ? 4 : 0, CardNumerics.length).map((label) => {
        return Object.keys(CardSuits).map((suit) => {
            return `${label}${suit}`;
        })
    }).flat();
}
