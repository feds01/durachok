import { animate } from "framer-motion";
import { useEffectEvent, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

import PlayingCard from "@/components/game/PlayingCard";
import { CardFlight } from "@/lib/deal";
import { AWAY, DECK, offsetTo, seatOf } from "@/lib/flight";

type Props = {
    flights: readonly CardFlight[];
    onLanded: (id: number) => void;
};

/**
 * The cards that the other players draw from the deck, face down, each flying to their seat,
 * over the rest of the page.
 */
export default function CardFlights({ flights, onLanded }: Props) {
    return createPortal(
        flights.map(({ id, to, delay }) => <Flight key={id} to={to} delay={delay} onLanded={() => onLanded(id)} />),
        document.body,
    );
}

function Flight({ to, delay, onLanded }: { to: string; delay: number; onLanded: () => void }) {
    const scope = useRef<HTMLDivElement>(null);
    // The parent passes a new function each render, which mustn't send the card off again.
    const landed = useEffectEvent(onLanded);

    useLayoutEffect(() => {
        const element = scope.current;
        const deck = document.querySelector(DECK);
        const seat = document.querySelector(seatOf(to));
        if (!element || !deck || !seat) {
            landed();
            return;
        }

        const from = deck.getBoundingClientRect();
        element.style.left = `${from.left}px`;
        element.style.top = `${from.top}px`;
        element.style.setProperty("--card-w", `${from.width}px`);

        element.style.transform = "";
        const { x, y, scale } = offsetTo(element, seat);
        const flight = animate(
            element,
            { x: [0, x], y: [0, y], scale: [1, scale], opacity: [1, 1, 0] },
            { ...AWAY, duration: 0.5, delay },
        );
        // A flight that's cut short, as when the effect runs again, doesn't count as landed.
        let cut = false;
        void flight.then(() => !cut && landed());

        return () => {
            cut = true;
            flight.stop();
        };
    }, [to, delay]);

    return (
        <div ref={scope} aria-hidden="true" className="pointer-events-none fixed z-30 opacity-0">
            <PlayingCard />
        </div>
    );
}
