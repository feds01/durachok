import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/** The cards in the fan, left to right. */
const SUITS = ["♤", "♡", "♢"];

/** How much smaller the fan is in a button than on its own. */
const SMALL_SCALE = 0.3;

/**
 * Three cards that fan out and gather again, the app's one sign that something is loading:
 * large on its own, and small inside a button.
 */
export function CardFan({ size = "lg" }: { size?: "lg" | "sm" }) {
    const fan = (
        <div className="relative h-20 w-14" aria-hidden="true">
            {SUITS.map((suit, index) => {
                const side = index - 1;
                return (
                    <motion.span
                        key={suit}
                        className={cn(
                            "absolute inset-0 flex items-center justify-center rounded-lg border-2 text-3xl text-primary shadow-lg",
                            // Light cards stand out on a button, which is the colour of the large fan's edges.
                            size === "lg" ? "border-primary bg-card" : "border-white bg-white",
                        )}
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
    );

    if (size === "lg") {
        return fan;
    }

    // The same fan, shrunk into the space of a line of text.
    return (
        <span className="relative inline-block h-6 w-[1.05rem]" aria-hidden="true">
            <span className="absolute left-0 top-0 origin-top-left" style={{ scale: SMALL_SCALE }}>
                {fan}
            </span>
        </span>
    );
}

interface Props {
    className?: string;
    /** What is loading, e.g. "Joining lobby 123456". */
    label?: string;
}

/** The fan of cards in the middle of the space it's given, with what is loading. */
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
            <CardFan />
            {label ? (
                <p className="m-0 font-body text-lg text-muted-foreground">{label}…</p>
            ) : (
                <span className="sr-only">Loading…</span>
            )}
        </motion.div>
    );
};

export default Loader;
