/**
 * How each suit is marked out while it's trumps, in its own colour, so that a glance at a
 * card's edge says that it's a trump, and of which suit.
 */
const TRUMP_TONES: Record<string, { edge: string; border: string }> = {
    H: { edge: "ring-rose-400/90 shadow-rose-400/45", border: "border-rose-400/70" },
    D: { edge: "ring-orange-400/90 shadow-orange-400/45", border: "border-orange-400/70" },
    C: { edge: "ring-emerald-400/90 shadow-emerald-400/45", border: "border-emerald-400/70" },
    S: { edge: "ring-violet-400/90 shadow-violet-400/45", border: "border-violet-400/70" },
};

/**
 * The glowing edge of a trump card of a suit: a glow whose colour is the suit's, which takes
 * over from a card's own shadow and its colour.
 */
export function trumpEdge(suit: string): string {
    return `ring-2 shadow-[0_0_12px] ${TRUMP_TONES[suit]?.edge ?? ""}`;
}

/** The border of something that shows the trump suit, such as its label. */
export function trumpBorder(suit: string): string {
    return TRUMP_TONES[suit]?.border ?? "";
}
