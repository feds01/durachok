import { CardNumerics, CardSuits } from "./consts";

import { Card, isDef } from "@durachok/transport";

/** A card read from its string, with its value, which orders it within its suit. */
export interface ParsedCard extends Card {
    /** The value of the card, from 2 up to 14 for an ace. */
    value: number;
}

/**
 * Reads a card from its string.
 *
 * @param card The card string, e.g. `10S` for the ten of spades.
 *
 * @throws Error if the card is invalid.
 */
export function cardFromString(card: string): ParsedCard {
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

/** The cards that a hand sorted this way keeps together: a suit, or a rank, with the trumps apart. */
function groupOf(card: string, trumpSuit: string, by: HandSort): string {
    const { suit, value } = cardFromString(card);
    if (by === "suit" || suit === trumpSuit) {
        return suit;
    }
    return String(value);
}

/**
 * A hand in the order that its player holds it: sorted, or in the order that they arranged
 * it themselves, without the cards that they no longer hold. A card that they got since, as
 * by taking the table, joins the cards of its suit, or of its rank, where they put them, in
 * its sorted place among them, and a card of a suit or rank that they didn't hold goes on the end.
 */
export function arrangeHand(cards: string[], trumpSuit: string, by: HandSort, arranged: string[] | null): string[] {
    const sorted = sortHand(cards, trumpSuit, by);
    if (!arranged) {
        return sorted;
    }

    const held = new Set(sorted);
    const hand = arranged.filter((card) => held.has(card));
    const kept = new Set(hand);
    const together = (a: string, b: string) => groupOf(a, trumpSuit, by) === groupOf(b, trumpSuit, by);

    // In the sorted order, the card before a new one is in the hand by the time that it goes in.
    const placeOf = (card: string, index: number): number => {
        const before = sorted[index - 1];
        if (isDef(before) && together(before, card)) {
            return hand.indexOf(before) + 1;
        }

        const after = sorted.slice(index + 1).find((other) => kept.has(other));
        if (isDef(after) && together(after, card)) {
            return hand.indexOf(after);
        }
        return hand.length;
    };

    for (const [index, card] of sorted.entries()) {
        if (!kept.has(card)) {
            hand.splice(placeOf(card, index), 0, card);
        }
    }
    return hand;
}
