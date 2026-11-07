import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";

import PlayingCard from "@/components/game/PlayingCard";
import { cn } from "@/lib/utils";
import { cardName } from "@durachok/engine";

type Props = {
    /** The cards, in the order that the player holds them. */
    cards: string[];
    /** The cards that the player can play now. */
    playable: ReadonlySet<string>;
    /** The card that the player picked up to play, while they choose where it goes. */
    selected: string | null;
    /** Whether the player has a move to make, so that the cards they can't play step back. */
    active: boolean;
    /** Cards that just came from the table, which fly in from there rather than rise into the hand. */
    pickedUp: ReadonlySet<string>;
    onPick: (card: string) => void;
};

/** How far the hand fans out, in degrees between neighbouring cards, with fewer degrees for more cards. */
function fanStep(count: number): number {
    return Math.min(4, 32 / Math.max(count, 1));
}

/**
 * The player's cards, fanned out along the bottom of the table. The cards overlap more as
 * the hand grows, so that it fits the screen, and the player plays one by clicking it or by
 * dragging it onto the table.
 */
export default function Hand({ cards, playable, selected, active, pickedUp, onPick }: Props) {
    const middle = (cards.length - 1) / 2;
    const step = fanStep(cards.length);

    return (
        <ul aria-label="Your cards" className="m-0 flex w-full list-none justify-center px-6 pb-6 pt-10">
            {cards.map((card, index) => {
                const offset = index - middle;
                return (
                    <HandCard
                        key={card}
                        card={card}
                        last={index === cards.length - 1}
                        rotate={offset * step}
                        // The cards sit along an arc, the outer ones lower.
                        dip={Math.abs(offset) ** 2 * 0.6}
                        playable={playable.has(card)}
                        selected={selected === card}
                        dimmed={active && !playable.has(card)}
                        fromTable={pickedUp.has(card)}
                        onPick={onPick}
                    />
                );
            })}
        </ul>
    );
}

type HandCardProps = {
    card: string;
    last: boolean;
    rotate: number;
    dip: number;
    playable: boolean;
    selected: boolean;
    dimmed: boolean;
    fromTable: boolean;
    onPick: (card: string) => void;
};

function HandCard({ card, last, rotate, dip, playable, selected, dimmed, fromTable, onPick }: HandCardProps) {
    const { listeners, setNodeRef, isDragging } = useDraggable({ id: card, disabled: !playable });
    const rest = selected ? -36 : dip;

    return (
        // Each card but the last takes part of its width, so that the next one overlaps it, and
        // gives up more of it when the hand is too wide for the screen.
        <li className={cn("min-w-3", last ? "flex-none" : "flex-[0_1_calc(var(--card-w)*0.62)]")}>
            <motion.button
                ref={setNodeRef}
                type="button"
                layoutId={card}
                {...listeners}
                onClick={() => onPick(card)}
                disabled={!playable}
                aria-pressed={selected}
                aria-label={`${playable ? "Play" : "Can't play"} the ${cardName(card)}`}
                data-card={card}
                data-playable={playable}
                className={cn(
                    "block cursor-grab touch-none rounded-[5%/3.6%] p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                    selected && "ring-2 ring-primary",
                )}
                style={{ transformOrigin: "50% 140%" }}
                initial={fromTable ? false : { opacity: 0, y: 48 }}
                animate={{
                    rotate,
                    y: rest,
                    opacity: isDragging ? 0 : 1,
                    // Darker rather than see-through, so the cards beneath don't show.
                    filter: dimmed ? "brightness(0.55) saturate(0.5)" : "brightness(1) saturate(1)",
                }}
                whileHover={playable && !selected ? { y: rest - 16 } : undefined}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
                <PlayingCard card={card} />
            </motion.button>
        </li>
    );
}
