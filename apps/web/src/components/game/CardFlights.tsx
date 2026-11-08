import { useAnimate } from "framer-motion";
import { useLayoutEffect } from "react";
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
    const [scope, animate] = useAnimate<HTMLDivElement>();

    useLayoutEffect(() => {
        const element = scope.current;
        const deck = document.querySelector(DECK);
        const seat = document.querySelector(seatOf(to));
        if (!element || !deck || !seat) {
            onLanded();
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
        void flight.then(() => !cut && onLanded());

        return () => {
            cut = true;
            flight.stop();
        };
        // Once, as the card sets off.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the flight is once
    }, []);

    return (
        <div ref={scope} aria-hidden="true" className="pointer-events-none fixed z-30 opacity-0">
            <PlayingCard />
        </div>
    );
}
