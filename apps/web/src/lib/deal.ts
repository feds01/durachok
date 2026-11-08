import { useState } from "react";

import { handSize } from "@durachok/engine";
import { PlayerGameState } from "@durachok/transport";

import { TableUpdate } from "./table";

/** How long apart the cards dealt to the players fly from the deck, one after another, in seconds. */
const DEAL_STEP = 0.06;

/** How long the cards of a round take to leave the table, before the new ones are drawn, in seconds. */
const CLEAR_SECONDS = 0.45;

/** A card, face down, on its way from the deck to another player. */
export type CardFlight = { id: number; to: string; delay: number };

/** What the deal knows from the updates so far. */
export type Deal = {
    /** The cards that the player has held this game, to tell the ones that they just drew. */
    held: ReadonlySet<string>;
    /** The cards that the player just drew, each with how long it waits before it flies in from the deck. */
    drawn: ReadonlyMap<string, number>;
    /** How many cards each other player held at the last update, to tell how many they drew since. */
    sizes: Readonly<Record<string, number | null>>;
    /** The other players' cards on their way from the deck. */
    flights: readonly CardFlight[];
    /** The id of the next flight. */
    nextId: number;
};

export const NO_DEAL: Deal = { held: new Set(), drawn: new Map(), sizes: {}, flights: [], nextId: 1 };

/**
 * How many cards a player drew from the deck between two updates: what they hold now, less
 * what they held before, which is nothing if they weren't counted, and less the cards that
 * they took from the table. Nothing is known of a hand whose size isn't told, as in mythic
 * mode, before or after.
 */
export function drawnCount(before: number | null | undefined, after: number | null, took: number): number {
    if (before === null || after === null) {
        return 0;
    }
    return Math.max(after - (before ?? 0) - took, 0);
}

/**
 * The deal after an update, or nothing when the update changed nothing that it knows. The
 * cards that it dealt fly from the deck as a dealer deals them, to one player after another,
 * the player first, once the last round's cards have left the table.
 */
export function dealAfter(deal: Deal, game: PlayerGameState, { pickup, newRound }: TableUpdate): Deal | null {
    const unseen = game.player.deck.filter((card) => !deal.held.has(card));
    const sizes = Object.fromEntries(game.players.map((other) => [other.name, handSize(other)]));
    const sameSizes = game.players.every(
        ({ name }) => Object.hasOwn(deal.sizes, name) && deal.sizes[name] === sizes[name],
    );
    if (unseen.length === 0 && sameSizes) {
        return null;
    }

    const dealers = 1 + game.players.length;
    const delayOf = (turn: number, seat: number) =>
        (newRound ? CLEAR_SECONDS : 0) + (turn * dealers + seat) * DEAL_STEP;
    const tookOf = (name: string) => (pickup?.player === name ? pickup.cards.length : 0);

    const taken = new Set(pickup?.player === game.player.name ? pickup.cards : []);
    const drawn = unseen.filter((card) => !taken.has(card));
    const flights = game.players.flatMap(({ name }, seat) =>
        Array.from({ length: drawnCount(deal.sizes[name], sizes[name], tookOf(name)) }, (_, turn) => ({
            to: name,
            delay: delayOf(turn, seat + 1),
        })),
    );

    return {
        held: new Set([...deal.held, ...unseen]),
        drawn: unseen.length > 0 ? new Map(drawn.map((card, turn) => [card, delayOf(turn, 0)])) : deal.drawn,
        sizes,
        flights: [...deal.flights, ...flights.map((flight, index) => ({ ...flight, id: deal.nextId + index }))],
        nextId: deal.nextId + flights.length,
    };
}

/** The cards that the players draw from the deck, which fly to them from there. */
export function useDeal(game: PlayerGameState, update: TableUpdate) {
    const [deal, setDeal] = useState(NO_DEAL);

    const next = dealAfter(deal, game, update);
    if (next) {
        setDeal(next);
    }

    return {
        drawn: deal.drawn,
        flights: deal.flights,
        landed: (id: number) =>
            setDeal((current) => ({ ...current, flights: current.flights.filter((f) => f.id !== id) })),
        // A card that the server turns down comes back from the table, not from the deck.
        forgetDrawn: () => setDeal((current) => ({ ...current, drawn: new Map() })),
    };
}
