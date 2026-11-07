import type { Transition, Variants } from "framer-motion";

/** The spring that elements settle into place with. */
export const settle: Transition = { type: "spring", stiffness: 260, damping: 26 };

/** Rises into place as it fades in. */
export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: settle },
};

/** Brings its children in one after another, each with its own `hidden` and `visible` variants. */
export function stagger(step = 0.06, delay = 0): Variants {
    return {
        hidden: {},
        visible: { transition: { staggerChildren: step, delayChildren: delay } },
    };
}

/** Grows into place, and shrinks away as it leaves, as a player in a lobby does. */
export const popIn: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: settle },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
};

/** Fades a page away before the app moves on, as logging in or out does. */
export const pageExit = { opacity: 0, scale: 0.97, transition: { duration: 0.25, ease: "easeIn" } } as const;
