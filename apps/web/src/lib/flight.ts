import { useAnimate } from "framer-motion";
import { useLayoutEffect } from "react";

/*
 * Cards that fly from one place at the table to another: from the deck into a hand, from a
 * player's seat onto the table, and from the table onto the discard pile or into a hand. Each
 * place is found on the page by a data attribute, and measured as the card sets off.
 */

/** The deck, where drawn cards come from. */
export const DECK = '[data-pile="deck"]';

/** The discard pile, where beaten cards go. */
export const DISCARD = '[data-pile="discard"]';

/** The cards that another player holds, where their cards come from and go to. */
export function seatOf(name: string): string {
    return `[data-seat="${CSS.escape(name)}"]`;
}

/** How a card leaves or lands, the same everywhere, so that every card moves alike. */
export const FLIGHT = { type: "spring", stiffness: 260, damping: 28 } as const;

/** The ease of a card that flies away and fades as it gets there. */
export const AWAY = { duration: 0.45, ease: [0.4, 0, 0.7, 1] } as const;

export type Offset = { x: number; y: number; scale: number };

/**
 * How far a card of the discard pile leans, in degrees, from its place in the pile, the same
 * each time, so that the pile doesn't shuffle as it grows.
 */
export function pileLean(index: number): number {
    return ((index * 37) % 24) - 12;
}

/**
 * How far an element's centre is from a place's, in the frame of the element's parent when
 * that is turned by `tilt` degrees, and how much taller or shorter the place is: a place is a
 * card high, or a row of cards, such as the small cards of a player's seat.
 */
export function offsetTo(element: Element, place: Element, tilt = 0): Offset {
    const from = element.getBoundingClientRect();
    const to = place.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const angle = (-tilt * Math.PI) / 180;
    const height = element instanceof HTMLElement ? element.offsetHeight : from.height;

    return {
        x: dx * Math.cos(angle) - dy * Math.sin(angle),
        y: dx * Math.sin(angle) + dy * Math.cos(angle),
        scale: height > 0 ? to.height / height : 1,
    };
}

/**
 * Flies an element in from a place on the page as it first appears, e.g. a card drawn from
 * the deck. It waits at the place for `delay` seconds, so that cards dealt together go one
 * after another. Without a place, or when the place isn't on the page, it just appears.
 */
export function useArrival<T extends HTMLElement>(from: string | null, { delay = 0, tilt = 0 } = {}) {
    const [scope, animate] = useAnimate<T>();

    useLayoutEffect(() => {
        const element = scope.current;
        const place = from ? document.querySelector(from) : null;
        if (!element || !place) {
            return;
        }

        // Measure where the element lands, rather than where an earlier run of this effect left it.
        element.style.transform = "";
        const { x, y, scale } = offsetTo(element, place, tilt);
        // Set off from the place before the browser paints, rather than show the card where it lands first.
        element.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        const flight = animate(element, { x: [x, 0], y: [y, 0], scale: [scale, 1] }, { ...FLIGHT, delay });

        return () => {
            flight.stop();
            element.style.transform = "";
        };
        // Only as the element first appears: where it flies from later doesn't matter.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the arrival is once
    }, []);

    return scope;
}
