import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import CopyButton from "@/components/CopyButton";
import { PANEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { range } from "@/utils";

/** How often the owner's waiting room asks for a new passphrase. */
const ROTATION_SECONDS = 20;

/** How far behind the card before it each card turns over, in seconds. */
const FLIP_STAGGER = 0.08;

type Props = {
    /** The lobby's passphrase, which only the owner sees. */
    passphrase: string;
    /** Ask the server for a new passphrase. */
    onRotate: () => void;
};

/**
 * The lobby's passphrase, as the owner reads it out to the players who join. It changes
 * every {@link ROTATION_SECONDS} seconds, so a passphrase that got out stops working, and
 * the cards turn over one after another to show the new one.
 */
export default function LobbyPassphrase({ passphrase, onRotate }: Props) {
    const symbols = Array.from(passphrase);

    return (
        <section className={cn(PANEL, "flex flex-col items-center gap-4")}>
            <h2 className="m-0 text-2xl">Passphrase</h2>
            <div
                className="group relative flex gap-2"
                style={{ perspective: 600 }}
                aria-label={`Passphrase ${passphrase}`}
            >
                {range(symbols.length).map((position) => (
                    <div key={position} className="relative h-20 w-16">
                        <AnimatePresence mode="wait" initial={false}>
                            {/* Keyed by the passphrase, so that every card turns over when it changes. */}
                            <motion.span
                                key={passphrase}
                                className="absolute inset-0 flex select-none items-center justify-center rounded-lg border-2 border-primary bg-card text-5xl text-primary [backface-visibility:hidden]"
                                initial={{ rotateY: -90, opacity: 0.4 }}
                                animate={{
                                    rotateY: 0,
                                    opacity: 1,
                                    transition: { delay: position * FLIP_STAGGER, duration: 0.25, ease: "easeOut" },
                                }}
                                exit={{
                                    rotateY: 90,
                                    opacity: 0.4,
                                    transition: { delay: position * FLIP_STAGGER, duration: 0.2, ease: "easeIn" },
                                }}
                            >
                                {symbols[position]}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                ))}
                <CopyButton
                    value={passphrase}
                    label="Copy the passphrase"
                    className="absolute left-full top-1/2 ml-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                />
            </div>
            {/* Keyed by the passphrase, so that a new passphrase restarts the countdown. */}
            <RotationCountdown key={passphrase} onRotate={onRotate} />
        </section>
    );
}

/** Counts down to the next passphrase, and asks for it when the time is up. */
function RotationCountdown({ onRotate }: { onRotate: () => void }) {
    const [secondsLeft, setSecondsLeft] = useState(ROTATION_SECONDS);

    useEffect(() => {
        const tick = setInterval(() => setSecondsLeft((seconds) => Math.max(seconds - 1, 0)), 1000);
        const rotation = setInterval(onRotate, ROTATION_SECONDS * 1000);

        return () => {
            clearInterval(tick);
            clearInterval(rotation);
        };
    }, [onRotate]);

    return (
        <p className="m-0 font-body text-muted-foreground" aria-live="polite">
            Changes in {secondsLeft}s
        </p>
    );
}
