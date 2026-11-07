import { HTMLMotionProps, motion } from "framer-motion";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";
import { cardName } from "@durachok/engine";

type Props = Omit<HTMLMotionProps<"div">, "children"> & {
    /** The card, e.g. `QH`, or nothing for a card that lies face down. */
    card?: string;
};

/**
 * A playing card, as wide as the `--card-w` of the element around it. A face-down card is
 * left out of the accessibility tree, as the number of cards says what it needs to.
 */
const PlayingCard = forwardRef<HTMLDivElement, Props>(function PlayingCard({ card, className, ...props }, ref) {
    return (
        <motion.div
            ref={ref}
            // The corners match the rounding of the cards' artwork.
            className={cn(
                "relative aspect-5/7 w-(--card-w) shrink-0 select-none rounded-[5%/3.6%] shadow-md shadow-black/40",
                !card && "card-back",
                className,
            )}
            aria-hidden={card ? undefined : true}
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
