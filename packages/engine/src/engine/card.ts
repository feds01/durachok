import { CardNumerics, CardSuits } from "./consts";

import { Card } from "@durachok/transport";

/**
 * Converts the card to a string.
 *
 * @param card The card to be converted to a string.
 *
 * @throws Error if the card is invalid.
 */
export function cardFromString(card: string): Card {
    const suit = card.substring(card.length - 1);
    const rawNumeric = card.substring(0, card.length - 1);

    if (!Object.keys(CardSuits).includes(suit)) {
        throw new Error("Invalid card suit.");
    }

    if (!CardNumerics.includes(rawNumeric)) {
        throw new Error("Invalid card numeric.");
    }

    return {
        value: CardNumerics.indexOf(rawNumeric) + 2,
        suit,
        card,
    };
}

/**
 * Generates a whole card deck for use in the format of a list. Each
 * element follows the format of '(label)(suit)'.
 *
 * @param {boolean} short - Whether the deck is short or not
 * */
export function generateCardDeck(short = false): string[] {
    return CardNumerics.slice(short ? 4 : 0, CardNumerics.length).flatMap((label) => {
        return Object.keys(CardSuits).map((suit) => {
            return `${label}${suit}`;
        });
    });
}

const RANK_NAMES: Record<string, string> = { J: "jack", Q: "queen", K: "king", A: "ace" };

const SUIT_NAMES: Record<string, string> = { H: "hearts", D: "diamonds", C: "clubs", S: "spades" };

/** The filled suit symbols, which read better at a glance than the outlined ones of `CardSuits`. */
const SUIT_SYMBOLS: Record<string, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };

/** The order of the suits in a hand, alternating their colours, before the trumps, which go last. */
const SUIT_ORDER = ["S", "H", "C", "D"];

/** A card's suit, e.g. `H` for the queen of hearts, `QH`. */
export function suitOf(card: string): string {
    return card.slice(-1);
}

/** A card's rank, e.g. `10` for the ten of spades, `10S`. */
export function rankOf(card: string): string {
    return card.slice(0, -1);
}

/** What a card is called, e.g. "queen of hearts". */
export function cardName(card: string): string {
    const rank = rankOf(card);
    return `${RANK_NAMES[rank] ?? rank} of ${SUIT_NAMES[suitOf(card)]}`;
}

export function suitName(suit: string): string {
    return SUIT_NAMES[suit] ?? suit;
}

export function suitSymbol(suit: string): string {
    return SUIT_SYMBOLS[suit] ?? suit;
}

/** Whether a suit is printed in red. */
export function isRedSuit(suit: string): boolean {
    return suit === "H" || suit === "D";
}

/** How a hand can be sorted: suit by suit, or rank by rank. */
export type HandSort = "suit" | "rank";

/**
 * A hand in the order that a player would hold it, with the trumps last either way: by suit,
 * each low to high, or low to high by rank, each rank's suits in the same order.
 */
export function sortHand(cards: string[], trumpSuit: string, by: HandSort = "suit"): string[] {
    const order = (card: string) => {
        const { suit, value } = cardFromString(card);
        const suitIndex = suit === trumpSuit ? SUIT_ORDER.length : SUIT_ORDER.indexOf(suit);
        if (by === "suit") {
            return suitIndex * 100 + value;
        }
        return (suit === trumpSuit ? 1000 : 0) + value * 10 + suitIndex;
    };

    return cards.toSorted((a, b) => order(a) - order(b));
}

/**
 * A hand in the order that its player holds it: sorted, or in the order that they arranged
 * it themselves, without the cards that they no longer hold, and with the cards that they got
 * since on the end, in their sorted order.
 */
export function arrangeHand(sorted: string[], arranged: string[] | null): string[] {
    if (!arranged) {
        return sorted;
    }

    const held = new Set(sorted);
    const kept = arranged.filter((card) => held.has(card));
    const placed = new Set(kept);
    return [...kept, ...sorted.filter((card) => !placed.has(card))];
}
