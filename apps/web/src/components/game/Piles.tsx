import PlayingCard from "@/components/game/PlayingCard";
import { pileLean } from "@/lib/flight";
import { cn } from "@/lib/utils";
import { expr, range } from "@/utils";
import { cardName, isRedSuit, suitName, suitSymbol } from "@durachok/engine";
import { Card } from "@durachok/transport";

/** How many cards of a pile to draw, enough to look like a pile. */
const PILE_DEPTH = 4;

type DeckProps = {
    /**
     * How many cards are left to draw, the last of which is the trump card, or null in mythic
     * mode, where the players only see that some are.
     */
    size: number | null;
    trump: Card;
};

/**
 * The cards left to draw, face down, on top of the trump card, which lies face up across
 * the bottom of the pile and is drawn last. Once the deck is gone, the trump suit stays.
 */
export function DeckPile({ size, trump }: DeckProps) {
    const backs = size === null ? PILE_DEPTH : Math.min(size - 1, PILE_DEPTH);
    // How much of the deck is left, in a word under it, and in a sentence for screen readers.
    const { label, left } = expr(() => {
        const last = `the last of them the ${cardName(trump.card)}`;
        if (size === null) {
            return { label: "Deck", left: `Cards are left to draw, ${last}.` };
        }
        if (size === 0) {
            return { label: "Deck empty", left: "No cards left to draw." };
        }
        return { label: `${size} left`, left: `${size} ${size === 1 ? "card" : "cards"} left to draw, ${last}.` };
    });

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative h-[calc(var(--card-w)*1.4)] w-[calc(var(--card-w)*1.6)]" aria-hidden="true">
                {/* Where drawn cards come from, which stays when the deck is gone. */}
                <span data-pile="deck" className="absolute left-0 top-0 aspect-5/7 w-(--card-w)" />
                {size === null || size > 0 ? (
                    <>
                        <PlayingCard
                            card={trump.card}
                            trump
                            className="absolute left-[calc(var(--card-w)*0.4)] top-0 rotate-90"
                            aria-hidden="true"
                        />
                        {range(backs).map((depth) => (
                            <PlayingCard
                                key={depth}
                                className="absolute left-0 top-0"
                                style={{ translate: `${depth * -1.5}px ${depth * -1.5}px` }}
                            />
                        ))}
                    </>
                ) : (
                    <TrumpSuit suit={trump.suit} className="absolute inset-y-0 left-0" />
                )}
            </div>
            <div className="flex flex-col items-center gap-0.5" aria-hidden="true">
                <span
                    data-trump={trump.suit}
                    className="flex items-center gap-1 rounded-full border border-(color:--trump)/70 bg-card/80 px-2 py-0.5 text-xs font-semibold"
                >
                    Trumps
                    <span className={cn("text-base leading-none", isRedSuit(trump.suit) && "text-rose-400")}>
                        {suitSymbol(trump.suit)}
                    </span>
                </span>
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="sr-only">
                Trumps are {suitName(trump.suit)}. {left}
            </p>
        </div>
    );
}

/** The trump suit, large, where the deck was. */
function TrumpSuit({ suit, className }: { suit: string; className?: string }) {
    return (
        <span
            className={cn(
                "flex aspect-5/7 w-(--card-w) items-center justify-center rounded-[5%/3.6%] border-2 border-dashed text-[calc(var(--card-w)*0.6)] leading-none",
                isRedSuit(suit) ? "text-rose-400" : "text-foreground",
                className,
            )}
        >
            {suitSymbol(suit)}
        </span>
    );
}

/**
 * The cards that were beaten and put aside, face down in an untidy pile, with how many there
 * are, unless that's null, in mythic mode.
 */
export function DiscardPile({ count }: { count: number | null }) {
    const shown = count === null ? PILE_DEPTH : Math.min(count, PILE_DEPTH);

    return (
        // The pile's cards lean out of its outline, by as much as the room it leaves them on
        // either side, so that the pile is as far from the table as the deck is.
        <div className="flex flex-col items-center gap-2 px-[calc(var(--card-w)*0.135)]">
            <div data-pile="discard" className="relative h-[calc(var(--card-w)*1.4)] w-(--card-w)" aria-hidden="true">
                {count === 0 ? (
                    // Where the pile goes, leaning like the card at its bottom will.
                    <span
                        className="absolute inset-0 rounded-[5%/3.6%] border-2 border-dashed"
                        style={{ rotate: `${pileLean(0)}deg` }}
                    />
                ) : (
                    range(shown).map((depth) => (
                        <PlayingCard
                            key={depth}
                            className="absolute left-0 top-0"
                            style={{ rotate: `${pileLean(depth)}deg` }}
                        />
                    ))
                )}
            </div>
            <p className="m-0 text-xs text-muted-foreground">
                {count === null ? (
                    "Discarded cards"
                ) : count > 0 ? (
                    `${count} discarded`
                ) : (
                    <span aria-hidden="true">Discard</span>
                )}
            </p>
        </div>
    );
}
