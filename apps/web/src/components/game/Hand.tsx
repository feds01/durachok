import { useDroppable } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { motion } from "framer-motion";

import PlayingCard from "@/components/game/PlayingCard";
import { DECK, useArrival } from "@/lib/flight";
import { HAND_ID } from "@/lib/drag";
import { cn } from "@/lib/utils";
import { cardName, suitOf } from "@durachok/engine";

type Props = {
    /** The cards, in the order that the player holds them. */
    cards: string[];
    /** The cards that the player can play now. */
    playable: ReadonlySet<string>;
    /** The card that the player picked up to play, while they choose where it goes. */
    selected: string | null;
    /** Whether the player has a move to make, so that the cards they can't play step back. */
    active: boolean;
    /** Cards just drawn from the deck, which fly in from there, each after its delay in seconds. */
    drawn: ReadonlyMap<string, number>;
    trumpSuit: string;
    onPick: (card: string) => void;
};

/** How far the hand fans out, in degrees between neighbouring cards, with fewer degrees for more cards. */
function fanStep(count: number): number {
    return Math.min(4, 32 / Math.max(count, 1));
}

/**
 * The player's cards, fanned out along the bottom of the table. The cards overlap more as
 * the hand grows, so that it fits the screen. The player plays one by clicking it or by
 * dragging it onto the table, and moves one by dragging it along the hand.
 */
export default function Hand({ cards, playable, selected, active, drawn, trumpSuit, onPick }: Props) {
    const { setNodeRef } = useDroppable({ id: HAND_ID });
    const middle = (cards.length - 1) / 2;
    const step = fanStep(cards.length);

    return (
        <SortableContext items={cards} strategy={horizontalListSortingStrategy}>
            {/* The last card shows all of its width, over the padding on the right. */}
            <ul
                ref={setNodeRef}
                aria-label="Your cards"
                className="m-0 flex w-full list-none justify-center pb-6 pl-6 pr-[calc(var(--card-w)*0.38+1.5rem)] pt-10"
            >
                {cards.map((card, index) => {
                    const offset = index - middle;
                    return (
                        <HandCard
                            key={card}
                            card={card}
                            rotate={offset * step}
                            // The cards sit along an arc, the outer ones lower.
                            dip={Math.abs(offset) ** 2 * 0.6}
                            playable={playable.has(card)}
                            selected={selected === card}
                            dimmed={active && !playable.has(card)}
                            trump={suitOf(card) === trumpSuit}
                            drawDelay={drawn.get(card)}
                            onPick={onPick}
                        />
                    );
                })}
            </ul>
        </SortableContext>
    );
}

type HandCardProps = {
    card: string;
    rotate: number;
    dip: number;
    playable: boolean;
    selected: boolean;
    dimmed: boolean;
    trump: boolean;
    /** How long a card drawn from the deck waits before it flies in, or nothing for a card that didn't come from there. */
    drawDelay?: number;
    onPick: (card: string) => void;
};

function HandCard({ card, rotate, dip, playable, selected, dimmed, trump, drawDelay, onPick }: HandCardProps) {
    // Any card can be moved along the hand, though only one that can be played goes on the table.
    const { listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useSortable({ id: card });
    const arrival = useArrival<HTMLDivElement>(drawDelay === undefined ? null : DECK, {
        delay: drawDelay,
        tilt: rotate,
    });
    const rest = selected ? -36 : dip;

    return (
        // Each card takes part of its width, so that the next one overlaps it, and gives up more
        // of it when the hand is too wide for the screen. The cards that make way for one that
        // the player drags along the hand slide over by that much.
        <li ref={setNodeRef} className="min-w-3 flex-[0_1_calc(var(--card-w)*0.62)]">
            <motion.button
                ref={setActivatorNodeRef}
                type="button"
                layoutId={card}
                {...listeners}
                onClick={() => playable && onPick(card)}
                aria-disabled={!playable}
                aria-pressed={selected}
                aria-label={`${playable ? "Play" : "Can't play"} the ${cardName(card)}`}
                data-card={card}
                data-playable={playable}
                className={cn(
                    "block cursor-grab touch-none rounded-[5%/3.6%] p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "ring-2 ring-primary",
                )}
                style={{ transformOrigin: "50% 140%" }}
                // A card comes from the deck or the table, and flies from there, rather than fade in.
                initial={false}
                animate={{
                    x: transform?.x ?? 0,
                    rotate,
                    y: rest,
                    opacity: isDragging ? 0 : 1,
                    // Darker rather than see-through, so the cards beneath don't show.
                    filter: dimmed ? "brightness(0.55) saturate(0.5)" : "brightness(1) saturate(1)",
                }}
                whileHover={playable && !selected ? { y: rest - 16 } : undefined}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
                <div ref={arrival}>
                    <PlayingCard card={card} trump={trump} />
                </div>
            </motion.button>
        </li>
    );
}
