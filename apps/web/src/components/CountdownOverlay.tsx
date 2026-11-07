import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/** How long the server counts down before it deals, in seconds. */
const COUNTDOWN_SECONDS = 5;

/** Covers the lobby while the server counts down to the start of the game. */
export default function CountdownOverlay() {
    const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

    useEffect(() => {
        const tick = setInterval(() => setSecondsLeft((seconds) => Math.max(seconds - 1, 1)), 1000);
        return () => clearInterval(tick);
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
            aria-live="polite"
        >
            <p className="m-0 font-body text-2xl text-muted-foreground">The game starts in</p>
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={secondsLeft}
                    initial={{ opacity: 0, scale: 1.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.3 }}
                    className="font-display text-9xl italic"
                >
                    {secondsLeft}
                </motion.span>
            </AnimatePresence>
        </div>
    );
}
