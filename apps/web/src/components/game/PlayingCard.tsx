import { HTMLMotionProps, motion } from "framer-motion";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";
import { cardName, suitOf } from "@durachok/engine";

type Props = Omit<HTMLMotionProps<"div">, "children"> & {
    /** The card, e.g. `QH`, or nothing for a card that lies face down. */
    card?: string;
    /** Whether the card is a trump, which an edge in its suit's colour marks out. */
    trump?: boolean;
};

/**
 * A playing card, as wide as the `--card-w` of the element around it. A face-down card is
 * left out of the accessibility tree, as the number of cards says what it needs to.
 */
const PlayingCard = forwardRef<HTMLDivElement, Props>(function PlayingCard({ card, trump, className, ...props }, ref) {
    return (
        <motion.div
            ref={ref}
            // The corners match the rounding of the cards' artwork.
            className={cn(
                "relative aspect-5/7 w-(--card-w) shrink-0 select-none rounded-[5%/3.6%] shadow-md shadow-black/40",
                !card && "card-back",
                // A glow in the suit's colour, which takes over from the card's own shadow.
                trump && "shadow-[0_0_12px] shadow-(color:--trump)/45 ring-2 ring-(color:--trump)/90",
                className,
            )}
            aria-hidden={card ? undefined : true}
            data-trump={trump && card ? suitOf(card) : undefined}
            {...props}
        >
            {card && (
                <img
                    src={`/cards/${card}.svg`}
                    alt={cardName(card)}
                    draggable={false}
                    className="pointer-events-none block size-full"
                />
            )}
        </motion.div>
    );
});

export default PlayingCard;
