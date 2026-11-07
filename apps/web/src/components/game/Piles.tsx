import PlayingCard from "@/components/game/PlayingCard";
import { cn } from "@/lib/utils";
import { cardName, isRedSuit, suitName, suitSymbol } from "@durachok/engine";
import { Card } from "@durachok/transport";

/** How many cards of a pile to draw, enough to look like a pile. */
const PILE_DEPTH = 4;

type DeckProps = {
    /** How many cards are left to draw, the last of which is the trump card. */
    size: number;
    trump: Card;
};

/**
 * The cards left to draw, face down, on top of the trump card, which lies face up across
 * the bottom of the pile and is drawn last. Once the deck is gone, the trump suit stays.
 */
export function DeckPile({ size, trump }: DeckProps) {
    const backs = Math.min(size - 1, PILE_DEPTH);
    const description =
        size > 0
            ? `${size} ${size === 1 ? "card" : "cards"} left to draw, the last of them the ${cardName(trump.card)}.`
            : `No cards left to draw. Trumps are ${suitName(trump.suit)}.`;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative h-[calc(var(--card-w)*1.4)] w-[calc(var(--card-w)*1.6)]" aria-hidden="true">
                {size > 0 ? (
                    <>
                        <PlayingCard
                            card={trump.card}
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
            <p className="m-0 text-xs text-muted-foreground">
                <span aria-hidden="true">{size > 0 ? `${size} left` : "Deck empty"}</span>
                <span className="sr-only">{description}</span>
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

/** The cards that were beaten and put aside, face down in an untidy pile. */
export function DiscardPile({ count }: { count: number }) {
    const shown = Math.min(count, PILE_DEPTH);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative h-[calc(var(--card-w)*1.4)] w-(--card-w)" aria-hidden="true">
                {count === 0 ? (
                    <span className="absolute inset-0 rounded-[5%/3.6%] border-2 border-dashed" />
                ) : (
                    Array.from({ length: shown }, (_, index) => (
                        <PlayingCard
                            // eslint-disable-next-line react/no-array-index-key -- the cards of a pile are alike
                            key={index}
                            className="absolute left-0 top-0"
                            // The same untidiness each time, so that the pile doesn't shuffle as it grows.
                            style={{ rotate: `${((index * 37) % 24) - 12}deg` }}
                        />
                    ))
                )}
            </div>
            <p className="m-0 text-xs text-muted-foreground">
                {count > 0 ? `${count} discarded` : <span aria-hidden="true">Discard</span>}
            </p>
        </div>
    );
}
