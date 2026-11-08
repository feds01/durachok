import { OpaquePlayerState, PlayerGameState, PlayerMove } from "@durachok/transport";

import { sortHand } from "./card";
import { TableSize } from "./consts";
import { Table, beats, passesAttack, rankOnTable, roomForAttack, uncoveredCount } from "./rules";

/*
 * What a player can do, worked out from their own view of the game, so that a client can
 * show it before the player tries a move. It follows the rules that the game checks its
 * moves against, and the game still checks every move.
 */

/** A card on the table, with the card that beat it, if any. */
export type TableCard = { card: string; coveredBy: string | null };

/** The cards on the table, in the order that they were played, which is their position. */
export function tableCards(state: PlayerGameState): TableCard[] {
    return Object.entries(state.tableTop).map(([card, coveredBy]) => ({ card, coveredBy }));
}

function tableOf(state: PlayerGameState): Table {
    return Object.entries(state.tableTop);
}

/** Another player's hand, which a player can see. */
export interface SeenHand {
    name: string;
    /** The cards, sorted by suit with the trumps last, as a player's own hand is. */
    cards: string[];
}

/**
 * The hands of the other players that a player can see, which are those of everyone still in the
 * game once the player is out of it, and none before.
 *
 * @param first - The player whose hand goes first, e.g. the one that was asked for.
 */
export function visibleHands(state: PlayerGameState, first?: string): SeenHand[] {
    const hands = state.players.flatMap(({ name, out, deck }) =>
        out === null && deck.type === "visible" ? [{ name, cards: sortHand(deck.cards, state.trump.suit) }] : [],
    );
    return hands.toSorted((a, b) => Number(b.name === first) - Number(a.name === first));
}

/** How many cards another player holds, whether or not this player can see them, or null in mythic mode. */
export function handSize(player: OpaquePlayerState): number | null {
    return player.deck.type === "visible" ? player.deck.cards.length : player.deck.size;
}

/** How many cards the defender holds, who is this player or another, or null if this player isn't told. */
function defenderHandSize(state: PlayerGameState): number | null {
    if (state.player.action === "defend") {
        return state.player.deck.length;
    }

    const defender = state.players.find(({ action }) => action === "defend");
    return defender ? handSize(defender) : 0;
}

/**
 * Whether the table has room for another attack on a defender with a hand of a size. When
 * the player isn't told the size, in mythic mode, they can try, and the game refuses an
 * attack that the defender can't beat.
 */
function attackFits(table: Table, defenderCards: number | null): boolean {
    return defenderCards === null ? table.length < TableSize : roomForAttack(table, defenderCards);
}

/**
 * Whether the player can put a card on the table: to attack, or, as the defender, to pass
 * the attack on to the next player.
 */
export function canPlace(state: PlayerGameState, card: string): boolean {
    const { player } = state;
    if (player.out !== null || !player.deck.includes(card)) {
        return false;
    }

    const table = tableOf(state);

    switch (player.action) {
        case "attack":
            return (table.length === 0 || rankOnTable(table, card)) && attackFits(table, defenderHandSize(state));
        case "defend": {
            // A defender who takes the cards can't pass them on.
            if (player.turned) {
                return false;
            }

            // The players after this one are in order, so the first still in the game is next.
            const next = state.players.find(({ out }) => out === null);
            return passesAttack(table, card) && next !== undefined && attackFits(table, handSize(next));
        }
        case "none":
            return false;
    }
}

/** Whether the player, as the defender, can beat the attack at a position on the table with a card. */
export function canCover(state: PlayerGameState, card: string, position: number): boolean {
    const { player } = state;
    // A defender who takes the cards can't beat them.
    if (player.action !== "defend" || player.turned || !player.deck.includes(card)) {
        return false;
    }

    const target = tableCards(state)[position];
    return target !== undefined && target.coveredBy === null && beats(card, target.card, state.trump.suit);
}

/** Every move that the player can make with a card. */
export function movesFor(state: PlayerGameState, card: string): PlayerMove[] {
    const covers = tableCards(state)
        .map((_, position) => position)
        .filter((position) => canCover(state, card, position))
        .map((position): PlayerMove => ({ type: "cover", card, position }));

    return canPlace(state, card) ? [{ type: "place", card }, ...covers] : covers;
}

/**
 * Whether the player can forfeit: an attacker says that they're done adding cards, and the
 * defender, with cards left to beat, takes them.
 */
export function canForfeit(state: PlayerGameState): boolean {
    const { player } = state;
    const table = tableOf(state);

    if (player.out !== null || player.turned || table.length === 0) {
        return false;
    }

    return player.action === "attack" || (player.action === "defend" && uncoveredCount(table) > 0);
}

/** Where the player is in the round, which says what they can do. */
export type Turn =
    /** The player has no cards left, and is out of the game. */
    | { kind: "out" }
    /** The player starts the attack on an empty table. */
    | { kind: "lead" }
    /** The player can add to the attack. */
    | { kind: "attack" }
    /** The player is done adding to the attack. */
    | { kind: "attackDone" }
    /** The player has cards to beat. */
    | { kind: "defend" }
    /** The player is taking the cards, which the attackers can still add to. */
    | { kind: "taking" }
    /** The player has beaten every card, and waits for the attackers. */
    | { kind: "defended" }
    /** The player waits for the round's attacker before they can join in. */
    | { kind: "wait"; attacker: string | null; defender: string | null };

export function turnOf(state: PlayerGameState): Turn {
    const { player } = state;
    const table = tableOf(state);

    if (player.out !== null) {
        return { kind: "out" };
    }

    switch (player.action) {
        case "attack":
            if (player.turned) {
                return { kind: "attackDone" };
            }
            return table.length === 0 ? { kind: "lead" } : { kind: "attack" };
        case "defend":
            if (player.turned) {
                return { kind: "taking" };
            }
            return uncoveredCount(table) > 0 ? { kind: "defend" } : { kind: "defended" };
        case "none": {
            const everyone = [player, ...state.players];
            return {
                kind: "wait",
                attacker: everyone.find(({ beganRound }) => beganRound)?.name ?? null,
                defender: everyone.find(({ action }) => action === "defend")?.name ?? null,
            };
        }
    }
}

/**
 * The player's view as it will be once the game accepts their move, so that a client can
 * show the move straight away rather than once the server answers.
 */
export function applyMove(state: PlayerGameState, move: PlayerMove): PlayerGameState {
    const without = (card: string) => state.player.deck.filter((held) => held !== card);

    switch (move.type) {
        case "place":
            return {
                ...state,
                player: { ...state.player, deck: without(move.card) },
                tableTop: { ...state.tableTop, [move.card]: null },
            };
        case "cover": {
            const attack = Object.keys(state.tableTop)[move.position];
            if (attack === undefined) {
                return state;
            }
            return {
                ...state,
                player: { ...state.player, deck: without(move.card) },
                tableTop: { ...state.tableTop, [attack]: move.card },
            };
        }
        case "forfeit":
            return { ...state, player: { ...state.player, turned: true } };
    }
}
