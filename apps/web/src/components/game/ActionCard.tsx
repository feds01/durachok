import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
    icon: LucideIcon;
    /** The word or two on the card. */
    label: string;
    /** What the card does, for screen readers, when its label doesn't say it all. */
    description?: string;
    /** `danger` for an action that costs the player, such as taking the cards. */
    tone?: "primary" | "danger";
    /**
     * How long the card waits for the player before it plays itself, in seconds, shown by a
     * line that sweeps down the card. Without it, the card waits for as long as it takes.
     */
    timeout?: number;
    /** What the time is for, which starts it again when it changes, e.g. the cards on the table. */
    timing?: string;
    onClick: () => void;
};

/** An action that the player can take, as a card beside their hand. */
export default function ActionCard({
    icon: Icon,
    label,
    description,
    tone = "primary",
    timeout,
    timing,
    onClick,
}: Props) {
    const name = description ?? label;

    return (
        <motion.button
            type="button"
            onClick={onClick}
            aria-label={timeout ? `${name}, automatically in ${timeout} seconds` : name}
            className={cn(
                "relative flex aspect-5/7 w-(--card-w) cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-[5%/3.6%] border-2 p-1 text-center font-semibold shadow-md shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tone === "danger"
                    ? "border-rose-400/70 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
                    : "border-primary/80 bg-primary/10 text-foreground hover:bg-primary/20",
            )}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -12 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
            {timeout !== undefined && (
                // What's left of the time fills the card below a line, which sweeps down to the bottom.
                <motion.span
                    key={timing}
                    aria-hidden="true"
                    className={cn(
                        "absolute inset-x-0 bottom-0 border-t-2",
                        tone === "danger" ? "border-rose-400 bg-rose-500/30" : "border-primary bg-primary/30",
                    )}
                    initial={{ height: "100%" }}
                    animate={{ height: "0%" }}
                    transition={{ duration: timeout, ease: "linear" }}
                    onAnimationComplete={onClick}
                />
            )}
            <Icon className="relative size-[calc(var(--card-w)*0.3)]" aria-hidden="true" />
            <span className="relative text-[calc(var(--card-w)*0.17)] leading-tight">{label}</span>
        </motion.button>
    );
}
