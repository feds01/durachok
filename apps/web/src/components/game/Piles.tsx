import PlayingCard from "@/components/game/PlayingCard";
import { trumpBorder } from "@/lib/trump";
import { cn } from "@/lib/utils";
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
    const description = `Trumps are ${suitName(trump.suit)}. ${
        size === null
            ? `Cards are left to draw, the last of them the ${cardName(trump.card)}.`
            : size > 0
              ? `${size} ${size === 1 ? "card" : "cards"} left to draw, the last of them the ${cardName(trump.card)}.`
              : "No cards left to draw."
    }`;

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
                        {Array.from({ length: backs }, (_, index) => (
                            <PlayingCard
                                // eslint-disable-next-line react/no-array-index-key -- the cards of a pile are alike
                                key={index}
                                className="absolute left-0 top-0"
                                style={{ translate: `${index * -1.5}px ${index * -1.5}px` }}
                            />
                        ))}
                    </>
                ) : (
                    <TrumpSuit suit={trump.suit} className="absolute inset-y-0 left-0" />
                )}
            </div>
            <div className="flex flex-col items-center gap-0.5" aria-hidden="true">
                <span
                    className={cn(
                        "flex items-center gap-1 rounded-full border bg-card/80 px-2 py-0.5 text-xs font-semibold",
                        trumpBorder(trump.suit),
                    )}
                >
                    Trumps
                    <span className={cn("text-base leading-none", isRedSuit(trump.suit) && "text-rose-400")}>
                        {suitSymbol(trump.suit)}
                    </span>
                </span>
                <span className="text-xs text-muted-foreground">
                    {size === null ? "Deck" : size > 0 ? `${size} left` : "Deck empty"}
                </span>
            </div>
            <p className="sr-only">{description}</p>
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

/** How far a card of the discard pile leans, in degrees, from its place in the pile. */
export function leanOf(index: number): number {
    return ((index * 37) % 24) - 12;
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
                        style={{ rotate: `${leanOf(0)}deg` }}
                    />
                ) : (
                    Array.from({ length: shown }, (_, index) => (
                        <PlayingCard
                            // eslint-disable-next-line react/no-array-index-key -- the cards of a pile are alike
                            key={index}
                            className="absolute left-0 top-0"
                            // The same untidiness each time, so that the pile doesn't shuffle as it grows.
                            style={{ rotate: `${leanOf(index)}deg` }}
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
