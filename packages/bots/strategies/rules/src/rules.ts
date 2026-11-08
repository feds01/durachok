import { Observation, Strategy } from "@durachok/bots";
import { TableCard, beats, cardFromString, turnOf } from "@durachok/engine";
import { PlayerMove, isSameMove } from "@durachok/transport";

type Place = Extract<PlayerMove, { type: "place" }>;
type Cover = Extract<PlayerMove, { type: "cover" }>;

/** The highest card, by value, that the rules add to an attack while the deck has cards: a ten. */
const HIGHEST_EARLY_ATTACK = 10;

/** The highest trump, by value, that the rules beat a card with while the deck has cards: a jack. */
const HIGHEST_EARLY_TRUMP = 11;

/** What the rules weigh a card by: the game's trump suit, and whether the deck has run out. */
interface Weights {
    trump: string;
    deckEmpty: boolean;
}

/**
 * A hand-written strategy, which plays as a careful person would: it plays its lowest cards
 * first, keeps its trumps for when it needs them, passes an attack on when it can do so
 * with a card that isn't a trump, and takes the cards rather than spend its best trumps
 * while the deck still has cards.
 */
export class RulesStrategy implements Strategy {
    public decide({ view, table, deck, moves }: Observation): PlayerMove {
        // In mythic mode the player isn't told about the deck, so they assume that it has cards.
        const weights = { trump: view.trump.suit, deckEmpty: deck?.size === 0 };
        const places = moves.filter(isPlace);
        const forfeit = moves.find(isForfeit);

        switch (turnOf(view).kind) {
            case "lead":
                return cheapest(places, weights) ?? moves[0]!;
            case "attack":
                return (
                    cheapest(
                        places.filter((move) => worthAdding(move.card, weights)),
                        weights,
                    ) ??
                    forfeit ??
                    moves[0]!
                );
            case "defend":
                return defend(view.player.deck, table, moves, weights);
            default:
                return moves[0]!;
        }
    }
}

/** Pass the attack on if it can cheaply, else beat every card if that's worth it, or take them. */
function defend(hand: string[], table: TableCard[], moves: PlayerMove[], weights: Weights): PlayerMove {
    const forfeit = moves.find(isForfeit);

    // A defender places a card to pass the attack on to the next player.
    const pass = cheapest(
        moves.filter(isPlace).filter((move) => !isTrump(move.card, weights)),
        weights,
    );
    if (pass) {
        return pass;
    }

    const plan = coverPlan(hand, table, weights);
    if (!plan || tooCostly(plan, weights)) {
        return forfeit ?? moves[0]!;
    }

    // Beat the first card, and plan again once the server takes the move.
    const [first] = plan;
    const cover = moves.find((move) =>
        isSameMove(move, { type: "cover", card: first!.card, position: first!.position }),
    );
    return cover ?? forfeit ?? moves[0]!;
}

/**
 * The cards with which the defender beats every card on the table that is still unbeaten,
 * or null if they can't beat them all. The hardest cards to beat go first, so that the
 * cheap cards which would beat them aren't spent on the easy ones.
 */
function coverPlan(hand: string[], table: TableCard[], weights: Weights): Cover[] | null {
    const attacks = table
        .map(({ card, coveredBy }, position) => ({ card, coveredBy, position }))
        .filter(({ coveredBy }) => coveredBy === null)
        .toSorted((a, b) => cost(b.card, weights) - cost(a.card, weights));
    const held = hand.toSorted((a, b) => cost(a, weights) - cost(b, weights));

    const plan: Cover[] = [];
    for (const attack of attacks) {
        const card = held.find((candidate) => beats(candidate, attack.card, weights.trump));
        if (!card) {
            return null;
        }

        held.splice(held.indexOf(card), 1);
        plan.push({ type: "cover", card, position: attack.position });
    }

    return plan;
}

/** Whether beating the cards would spend trumps that are worth keeping: while the deck has cards, more than one, or a high one. */
function tooCostly(plan: Cover[], weights: Weights): boolean {
    if (weights.deckEmpty) {
        return false;
    }

    const trumps = plan.filter(({ card }) => isTrump(card, weights));
    return trumps.length > 1 || trumps.some(({ card }) => cardFromString(card).value > HIGHEST_EARLY_TRUMP);
}

/** Whether a card is worth adding to an attack: once the deck has run out, any, and before then, a low card that isn't a trump. */
function worthAdding(card: string, weights: Weights): boolean {
    if (weights.deckEmpty) {
        return true;
    }

    return !isTrump(card, weights) && cardFromString(card).value <= HIGHEST_EARLY_ATTACK;
}

/** The cheapest of the cards to place, if there are any. */
function cheapest(places: Place[], weights: Weights): Place | undefined {
    return places.toSorted((a, b) => cost(a.card, weights) - cost(b.card, weights))[0];
}

/** What a card is worth keeping: its value, and any trump more than any card that isn't one. */
function cost(card: string, weights: Weights): number {
    const { value } = cardFromString(card);
    return isTrump(card, weights) ? 100 + value : value;
}

function isTrump(card: string, weights: Weights): boolean {
    return cardFromString(card).suit === weights.trump;
}

function isPlace(move: PlayerMove): move is Place {
    return move.type === "place";
}

function isForfeit(move: PlayerMove): boolean {
    return move.type === "forfeit";
}
