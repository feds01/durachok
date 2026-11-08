/** The id of the player's hand, for a card dragged over it, which goes back in among the others. */
export const HAND_ID = "hand";

/**
 * The player's cards in the order that they hold them: sorted, or in the order that they
 * arranged them by hand, with the cards that they got since on the end, as sorted.
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
