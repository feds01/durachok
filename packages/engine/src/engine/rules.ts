import { cardFromString } from "./card";
import { TableSize } from "./consts";

/*
 * The rules of the table. The game checks its moves against them, and a player's view of
 * the game uses them to show what the player can do, so that both follow the same rules.
 */

/** The cards on the table, in the order they were played: each attack, and the card that beat it, if any. */
export type Table = ReadonlyArray<readonly [attack: string, cover: string | null]>;

/** Whether a card beats another: a higher card of its suit, or a trump on a card that isn't one. */
export function beats(cover: string, attack: string, trumpSuit: string): boolean {
    const covering = cardFromString(cover);
    const attacking = cardFromString(attack);

    if (covering.suit === attacking.suit) {
        return covering.value > attacking.value;
    }

    return covering.suit === trumpSuit;
}

/** How many of the attacks on the table are unbeaten. */
export function uncoveredCount(table: Table): number {
    return table.filter(([, cover]) => cover === null).length;
}

/** Whether a card's rank is on the table, as an attack or as a card that beat one. */
export function rankOnTable(table: Table, card: string): boolean {
    const { value } = cardFromString(card);

    return table.some(
        ([attack, cover]) =>
            cardFromString(attack).value === value || (cover !== null && cardFromString(cover).value === value),
    );
}

/**
 * Whether the table has room for another attack on a defender who holds the given number
 * of cards: it holds six attacks at most, and no more unbeaten ones than the defender can beat.
 */
export function roomForAttack(table: Table, defenderHandSize: number): boolean {
    return table.length < TableSize && uncoveredCount(table) + 1 <= defenderHandSize;
}

/**
 * Whether the defender can pass the attack on to the next player with a card: before they
 * beat anything, with a card of the one rank that every attack on the table has.
 */
export function passesAttack(table: Table, card: string): boolean {
    const { value } = cardFromString(card);

    return (
        table.length > 0 && table.every(([attack, cover]) => cover === null && cardFromString(attack).value === value)
    );
}
