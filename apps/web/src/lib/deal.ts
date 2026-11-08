import { useState } from "react";

import { handSize } from "@durachok/engine";
import { Action, PlayerGameState } from "@durachok/transport";

/** How long apart the cards dealt to the players fly from the deck, one after another, in seconds. */
const DEAL_STEP = 0.06;

/** How long the cards of a round take to leave the table, before the new ones are drawn, in seconds. */
const CLEAR_SECONDS = 0.45;

type Pickup = Extract<Action, { type: "pickup" }>;

/** A card, face down, on its way from the deck to another player. */
export type CardFlight = { id: number; to: string; delay: number };

/**
 * How many cards each other player drew from the deck between two updates, from how many
 * they held before and after, less the cards that they took from the table. A player who
 * wasn't counted before held nothing, and nothing is known of a hand whose size isn't told,
 * as in mythic mode, either side of the update.
 */
export function drawnSince(
    before: Readonly<Record<string, number | null>>,
    after: readonly { name: string; size: number | null }[],
    pickup: Pickup | null,
): { name: string; count: number }[] {
    return after.flatMap(({ name, size }) => {
        const held = Object.hasOwn(before, name) ? before[name] : 0;
        if (size === null || held === null) {
            return [];
        }
        const took = pickup?.player === name ? pickup.cards.length : 0;
        const count = size - held - took;
        return count > 0 ? [{ name, count }] : [];
    });
}

/**
 * The cards that the players draw from the deck, which fly to them from there, one player
 * after another, as they're dealt, and once the last round's cards have left the table: the
 * player's own cards, each with how long it waits, and the other players' face-down ones.
 */
export function useDeal(game: PlayerGameState, { pickup, newRound }: { pickup: Pickup | null; newRound: boolean }) {
    // The cards that the player has held this game, to tell the ones that they just drew.
    const [held, setHeld] = useState<ReadonlySet<string>>(() => new Set());
    const [drawn, setDrawn] = useState<ReadonlyMap<string, number>>(() => new Map());
    // How many cards the other players held at the last update, to tell how many they drew since.
    const [sizes, setSizes] = useState<Record<string, number | null>>({});
    const [flights, setFlights] = useState<CardFlight[]>([]);

    const from = newRound ? CLEAR_SECONDS : 0;
    const dealers = 1 + game.players.length;
    const taken = new Set(pickup?.player === game.player.name ? pickup.cards : []);

    const unseen = game.player.deck.filter((card) => !held.has(card));
    if (unseen.length > 0) {
        setHeld(new Set([...held, ...unseen]));
        setDrawn(
            new Map(
                unseen
                    .filter((card) => !taken.has(card))
                    .map((card, index) => [card, from + index * dealers * DEAL_STEP] as const),
            ),
        );
    }

    const now = game.players.map((other) => ({ name: other.name, size: handSize(other) }));
    if (now.some(({ name, size }) => !Object.hasOwn(sizes, name) || sizes[name] !== size)) {
        setSizes(Object.fromEntries(now.map(({ name, size }) => [name, size])));
        const dealt = drawnSince(sizes, now, pickup).flatMap(({ name, count }) => {
            const seat = now.findIndex((other) => other.name === name);
            return Array.from({ length: count }, (_, index) => ({
                to: name,
                delay: from + (index * dealers + seat + 1) * DEAL_STEP,
            }));
        });
        if (dealt.length > 0) {
            const firstId = (flights.at(-1)?.id ?? 0) + 1;
            setFlights([...flights, ...dealt.map((flight, index) => ({ ...flight, id: firstId + index }))]);
        }
    }

    return {
        drawn,
        flights,
        landed: (id: number) => setFlights((current) => current.filter((flight) => flight.id !== id)),
        // A card that the server turns down comes back from the table, not from the deck.
        forgetDrawn: () => setDrawn(new Map()),
    };
}
