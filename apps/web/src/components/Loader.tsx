import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/** The cards in the fan, left to right. */
const SUITS = ["♤", "♡", "♢"];

interface Props {
    className?: string;
    /** What is loading, e.g. "Joining lobby 123456". */
    label?: string;
}

/** Three cards that fan out and gather again while something loads. */
const Loader = ({ className, label }: Props) => {
    return (
        <motion.div
            className={cn("flex h-full flex-col items-center justify-center gap-6", className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // A load that finishes quickly is over before the loader shows, rather than flashing it.
            transition={{ delay: 0.15, duration: 0.3 }}
            aria-live="polite"
        >
            <div className="relative h-20 w-14" aria-hidden="true">
                {SUITS.map((suit, index) => {
                    const side = index - 1;
                    return (
                        <motion.span
                            key={suit}
                            className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-primary bg-card text-3xl text-primary shadow-lg"
                            // Fan out around the bottom of the cards, as a hand of cards does.
                            style={{ originY: 1, zIndex: side === 0 ? 1 : 0 }}
                            animate={{
                                rotate: [0, side * 22, 0],
                                x: [0, side * 12, 0],
                                y: side === 0 ? [0, -6, 0] : 0,
                            }}
                            transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.2 }}
                        >
                            {suit}
                        </motion.span>
                    );
                })}
            </div>
            {label ? (
                <p className="m-0 font-body text-lg text-muted-foreground">{label}…</p>
            ) : (
                <span className="sr-only">Loading…</span>
            )}
        </motion.div>
    );
};

export default Loader;
