import { z } from "zod";

import { Action } from "@durachok/transport";

import { expr } from "../utils";

type Played = Extract<Action, { type: "place" | "cover" }>;
type Pickup = Extract<Action, { type: "pickup" }>;

/** Where the cards on the table go as it clears at the end of a round. */
export type ClearTo =
    /** The defender beat them all, so they're discarded. */
    | { to: "discard" }
    /** The player took them, so they fly into their hand. */
    | { to: "hand" }
    /** Another player took them, so they fly to their seat. */
    | { to: "seat"; player: string };

const ClearToSchema: z.ZodType<ClearTo> = z.discriminatedUnion("to", [
    z.object({ to: z.literal("discard") }),
    z.object({ to: z.literal("hand") }),
    z.object({ to: z.literal("seat"), player: z.string() }),
]);

/**
 * Where the table clears to, from what an animation was handed, which isn't typed, @see ClearTo.
 * Anything else, such as nothing while the round goes on, is nowhere.
 */
export function readClearTo(data: unknown): ClearTo | null {
    const parsed = ClearToSchema.safeParse(data);
    if (!parsed.success) {
        return null;
    }
    return parsed.data;
}

/** Where the table's cards came from, which says where they fly in from, and which are trumps. */
export type CardSources = {
    /** Cards that the player just played, which fly from their hand. */
    fromHand: ReadonlySet<string>;
    /** The card that the player dropped onto the table, which lands where they let go of it. */
    dropped: string | null;
    /** Who played the cards that other players just played, which fly from their seats. */
    playedBy: ReadonlyMap<string, string>;
    trumpSuit: string;
};

/** What the last update did at the table, as the player sees it. */
export type TableUpdate = {
    /** The cards that the player played. */
    mine: string[];
    /** Who played each of the cards that the other players played. */
    playedBy: ReadonlyMap<string, string>;
    /** The cards that the defender took from the table, if they took them. */
    pickup: Pickup | null;
    /** Whether the round ended, and a new one began. */
    newRound: boolean;
    /** Where the table's cards go, if the update cleared the table, or nothing while the round goes on. */
    clearTo: ClearTo | null;
};

/**
 * Read what the last update's actions did at the table, from the player's side of it, or a
 * spectator's, from whose side every card is another player's.
 */
export function readActions(actions: readonly Action[], me: string | null): TableUpdate {
    const played = actions.filter((action): action is Played => action.type === "place" || action.type === "cover");
    const pickup = actions.find((action): action is Pickup => action.type === "pickup") ?? null;
    const newRound = actions.some(({ type }) => type === "new_round");

    const clearTo = expr((): ClearTo | null => {
        if (pickup) {
            return pickup.player === me ? { to: "hand" } : { to: "seat", player: pickup.player };
        }
        return newRound ? { to: "discard" } : null;
    });

    return {
        mine: played.filter(({ player }) => player === me).map(({ card }) => card),
        playedBy: new Map(played.filter(({ player }) => player !== me).map(({ card, player }) => [card, player])),
        pickup,
        newRound,
        clearTo,
    };
}
