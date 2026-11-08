import {
    closestCenter,
    CollisionDetection,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    DroppableContainer,
    PointerSensor,
    pointerWithin,
    rectIntersection,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { LayoutGroup } from "framer-motion";
import { Check, Hand, Lightbulb, LightbulbOff, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import Logo from "@/components/Logo";
import UserAvatar from "@/components/UserAvatar";
import ActionCard from "@/components/game/ActionCard";
import CardFlights, { CardFlight } from "@/components/game/CardFlights";
import PlayerHand, { HAND_ID } from "@/components/game/Hand";
import OpponentSeat from "@/components/game/OpponentSeat";
import { DeckPile, DiscardPile } from "@/components/game/Piles";
import PlayingCard from "@/components/game/PlayingCard";
import RoleBadge from "@/components/game/RoleBadge";
import RoundAnnouncement, { useRoundAnnouncement } from "@/components/game/RoundAnnouncement";
import SortControl from "@/components/game/SortControl";
import TableArea, { CardSources, ClearTo, Targets } from "@/components/game/TableArea";
import { Button } from "@/components/ui/button";
import { useLobbyStore } from "@/contexts/lobby";
import { arrangeHand } from "@/lib/hand";
import { usePreference } from "@/lib/preferences";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import {
    HandSort,
    Turn,
    applyMove,
    canCover,
    canForfeit,
    canPlace,
    handSize,
    movesFor,
    sortHand,
    tableCards,
    turnOf,
} from "@durachok/engine";
import { Action, Lobby, PlayerGameState, PlayerMove } from "@durachok/transport";

type Props = {
    lobby: Lobby;
    game: PlayerGameState;
};

type Pickup = Extract<Action, { type: "pickup" }>;

/** How long the round waits on an attacker before it takes them as done, in seconds. */
const DONE_TIMEOUT_SECONDS = 8;

/** How long apart the cards dealt to the players fly from the deck, one after another, in seconds. */
const DEAL_STEP = 0.06;

/** How long the cards of a round take to leave the table, before the new ones are drawn, in seconds. */
const CLEAR_SECONDS = 0.45;

/** Whether a place to drop a card is one of the cards in the player's hand. */
const inHand = ({ data }: DroppableContainer) => data.current?.sortable !== undefined;

/**
 * Where a dragged card goes: onto the attack that it's over, before the table around it,
 * and over the hand, to the place of the card under the pointer, as the cards overlap.
 */
const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const onTable = hits.find(({ id }) => String(id).startsWith("slot-")) ?? hits.find(({ id }) => id === "table");

    if (onTable) {
        return [onTable];
    }
    const pointer = args.pointerCoordinates;
    if (pointer && hits.some(({ id }) => id === HAND_ID)) {
        return closestCenter({
            ...args,
            collisionRect: {
                left: pointer.x,
                right: pointer.x,
                top: pointer.y,
                bottom: pointer.y,
                width: 0,
                height: 0,
            },
            droppableContainers: args.droppableContainers.filter(inHand),
        });
    }
    const around = args.droppableContainers.filter((container) => !inHand(container) && container.id !== HAND_ID);
    return rectIntersection({ ...args, droppableContainers: around });
};

/**
 * The game, as the player sees it: the other players along the top, the deck, the table and
 * the discarded cards across the middle, and the player's own cards along the bottom. The
 * engine says what the player can do, and the table shows it.
 */
export default function GameTable({ lobby, game }: Props) {
    const { pending, actions, dispatchMove } = useLobbyStore(
        useShallow((state) => ({ pending: state.pending, actions: state.actions, dispatchMove: state.dispatchMove })),
    );
    const [selected, setSelected] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dropped, setDropped] = useState<string | null>(null);
    const [muted, setMuted] = usePreference("muted");
    const [hints, setHints] = usePreference("hints");
    const [byRank, setByRank] = usePreference("sortByRank");
    // The order that the player put their cards in by hand, until they sort them again.
    const [arranged, setArranged] = useState<string[] | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    // The cards that the player has held this game, and the ones that they just drew, each
    // with how long it waits before it flies in from the deck.
    const [draws, setDraws] = useState<{ held: ReadonlySet<string>; drawn: ReadonlyMap<string, number> }>(() => ({
        held: new Set(),
        drawn: new Map(),
    }));
    // How many cards the other players held at the last update, to tell how many they drew since.
    const [handSizes, setHandSizes] = useState<Record<string, number | null>>({});
    const [flights, setFlights] = useState<CardFlight[]>([]);
    // The server's view, as the player's own move doesn't change their role or clear the table.
    const [announcement, dismissAnnouncement] = useRoundAnnouncement(game);

    // The player sees their move straight away, until the server answers it.
    const view = useMemo(() => (pending ? applyMove(game, pending) : game), [game, pending]);
    const { player, players, trump } = view;
    const me = player.name;
    const table = tableCards(view);
    const turn = turnOf(view);
    const hand = useMemo(
        () => arrangeHand(sortHand(player.deck, trump.suit, byRank ? "rank" : "suit"), arranged),
        [player.deck, trump.suit, byRank, arranged],
    );
    // Nothing more can be played until the server answers the last move.
    const playable = useMemo(
        () => new Set(pending ? [] : hand.filter((card) => movesFor(view, card).length > 0)),
        [hand, view, pending],
    );

    // The last update says where the table's cards came from, and where they go when it clears.
    const fromHand = new Set([
        ...(pending && pending.type !== "forfeit" ? [pending.card] : []),
        ...actions.flatMap((action) =>
            (action.type === "place" || action.type === "cover") && action.player === me ? [action.card] : [],
        ),
    ]);
    const pickup = actions.find((action): action is Pickup => action.type === "pickup");
    const clearTo: ClearTo = !pickup
        ? { to: "discard" }
        : pickup.player === me
          ? { to: "hand" }
          : { to: "seat", player: pickup.player };
    const pickedUp = new Set(pickup?.player === me ? pickup.cards : []);
    const sources: CardSources = {
        fromHand,
        dropped,
        playedBy: new Map(
            actions.flatMap((action) =>
                (action.type === "place" || action.type === "cover") && action.player !== me
                    ? [[action.card, action.player] as const]
                    : [],
            ),
        ),
        trumpSuit: trump.suit,
    };

    // The cards that each player draws from the deck fly to them from there, one player after
    // another, as they're dealt, and once the last round's cards have left the table.
    const dealFrom = actions.some(({ type }) => type === "new_round") ? CLEAR_SECONDS : 0;
    const dealers = 1 + game.players.length;
    const unseen = game.player.deck.filter((card) => !draws.held.has(card));
    if (unseen.length > 0) {
        const drawn = unseen.filter((card) => !pickedUp.has(card));
        setDraws({
            held: new Set([...draws.held, ...unseen]),
            drawn: new Map(drawn.map((card, index) => [card, dealFrom + index * dealers * DEAL_STEP])),
        });
    }
    if (game.players.some((other) => handSizes[other.name] !== handSize(other))) {
        const dealt = game.players.flatMap((other, seat) => {
            const before = handSizes[other.name] ?? 0;
            const now = handSize(other);
            const took = pickup?.player === other.name ? pickup.cards.length : 0;
            // Nobody is told how many cards a player holds in mythic mode, nor so how many they drew.
            const drew = now === null || before === null ? 0 : now - before - took;
            return Array.from({ length: Math.max(drew, 0) }, (_, index) => ({
                to: other.name,
                delay: dealFrom + (index * dealers + seat + 1) * DEAL_STEP,
            }));
        });
        const firstId = (flights.at(-1)?.id ?? 0) + 1;
        setHandSizes(Object.fromEntries(game.players.map((other) => [other.name, handSize(other)])));
        if (dealt.length > 0) {
            setFlights([...flights, ...dealt.map((flight, index) => ({ ...flight, id: firstId + index }))]);
        }
    }

    useEffect(() => playSound("begin"), []);
    useEffect(() => {
        if (actions.some(({ type }) => type === "place" || type === "cover")) {
            playSound("place");
        }
    }, [actions]);

    // Escape puts back the card that the player picked up.
    useEffect(() => {
        if (!selected) return;

        const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selected]);

    const holding = dragging ?? selected;
    const targets: Targets | null = holding
        ? {
              place: canPlace(view, holding),
              cover: new Set(table.flatMap((_, position) => (canCover(view, holding, position) ? [position] : []))),
          }
        : null;

    const sortBy = (by: HandSort) => {
        setByRank(by === "rank");
        setArranged(null);
    };

    const play = (move: PlayerMove) => {
        setSelected(null);
        // A card that the server turns down comes back from the table, not from the deck.
        setDraws((current) => ({ ...current, drawn: new Map() }));
        dispatchMove(move);
    };

    // A card with one move plays straight away, and one with several waits for the player to choose.
    const pick = (card: string) => {
        setDropped(null);
        if (selected === card) {
            setSelected(null);
            return;
        }

        const moves = movesFor(view, card);
        if (moves.length === 1) {
            play(moves[0]);
        } else if (moves.length > 1) {
            setSelected(card);
        }
    };

    const onDragStart = ({ active }: DragStartEvent) => {
        setSelected(null);
        setDropped(null);
        setDragging(String(active.id));
    };

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        setDragging(null);
        const card = String(active.id);
        const target = over ? String(over.id) : "";
        const position = Number(target.replace("slot-", ""));

        // The player moved the card along their hand.
        if (hand.includes(target)) {
            if (target !== card) {
                setArranged(arrayMove(hand, hand.indexOf(card), hand.indexOf(target)));
            }
            return;
        }

        const move: PlayerMove | null =
            target === "table" && canPlace(view, card)
                ? { type: "place", card }
                : target.startsWith("slot-") && canCover(view, card, position)
                  ? { type: "cover", card, position }
                  : null;

        if (move) {
            setDropped(card);
            play(move);
        }
    };

    // The players who are out, in the order they went out, which is their place.
    const outOrder = [player, ...players]
        .filter(({ out }) => out !== null)
        .toSorted((a, b) => (a.out ?? 0) - (b.out ?? 0))
        .map(({ name }) => name);
    const placeOf = (name: string) => (outOrder.includes(name) ? outOrder.indexOf(name) + 1 : undefined);
    const imageOf = (name: string) => lobby.players.find((other) => other.name === name)?.image;

    const canPass = player.action === "defend" && hand.some((card) => canPlace(view, card));
    const mustAct = turn.kind === "lead" || turn.kind === "attack" || turn.kind === "defend";

    // The round waits on an attacker once every card is beaten, or the defender takes them, so
    // it doesn't wait forever: the same time for everyone, which doesn't say what they hold.
    const defenderTaking = players.some(({ action, turned }) => action === "defend" && turned);
    const waitingOnMe =
        turn.kind === "attack" && (defenderTaking || table.every(({ coveredBy }) => coveredBy !== null));
    const roundState = `${JSON.stringify(view.tableTop)}:${defenderTaking}`;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDragging(null)}
        >
            <LayoutGroup>
                <div className="flex min-h-full flex-col [--card-w:56px] sm:[--card-w:76px] lg:[--card-w:92px]">
                    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
                        <div className="max-sm:hidden">
                            <Logo size={28} />
                        </div>
                        <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-between">
                            <span className="rounded-full border bg-card/80 px-3 py-1 text-sm text-muted-foreground">
                                Lobby <span className="font-semibold tabular-nums text-foreground">{lobby.pin}</span>
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setHints(!hints)}
                                aria-label={hints ? "Hide the hints" : "Show hints"}
                                aria-pressed={hints}
                                title={hints ? "Hints on" : "Hints off"}
                            >
                                {hints ? <Lightbulb /> : <LightbulbOff />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMuted(!muted)}
                                aria-label={muted ? "Turn the sound on" : "Turn the sound off"}
                                title={muted ? "Sound off" : "Sound on"}
                            >
                                {muted ? <VolumeX /> : <Volume2 />}
                            </Button>
                        </div>
                    </header>

                    <ul
                        aria-label="Other players"
                        className="m-0 flex list-none flex-wrap justify-center gap-3 px-4 py-0"
                    >
                        {players.map((other) => (
                            <OpponentSeat
                                key={other.name}
                                player={other}
                                image={imageOf(other.name)}
                                place={placeOf(other.name)}
                            />
                        ))}
                    </ul>

                    {/* The deck and the discard pile take columns as wide as each other, as far from the table. */}
                    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-2 items-center gap-4 px-4 py-4 sm:grid-cols-[calc(var(--card-w)*1.6)_1fr_calc(var(--card-w)*1.6)]">
                        <div className="justify-self-start">
                            <DeckPile size={view.deckSize} trump={trump} />
                        </div>
                        <div className="relative col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                            <TableArea
                                cards={table}
                                role={player.out === null ? player.action : "none"}
                                targets={targets}
                                defending={player.action === "defend"}
                                clearTo={clearTo}
                                sources={sources}
                                onPlace={() => holding && play({ type: "place", card: holding })}
                                onCover={(position) => holding && play({ type: "cover", card: holding, position })}
                            />
                            <RoundAnnouncement announcement={announcement} onDone={dismissAnnouncement} />
                        </div>
                        <div className="justify-self-end sm:justify-self-start">
                            <DiscardPile count={view.discardSize} />
                        </div>
                    </div>

                    <section aria-label="You" className="relative flex flex-col items-center gap-2">
                        {/* A hint floats over the space above the player, so that turning hints on moves nothing. */}
                        {hints && (
                            <p
                                className="pointer-events-none absolute inset-x-4 bottom-full m-0 flex justify-center pb-2 text-center"
                                aria-live="polite"
                            >
                                <span
                                    className={cn(
                                        "max-w-xl rounded-2xl bg-background/80 px-3 py-1 backdrop-blur-sm",
                                        mustAct ? "font-semibold text-foreground" : "text-muted-foreground",
                                    )}
                                >
                                    {describeTurn(turn, { canPass, tableClear: table.length === 0 })}
                                </span>
                            </p>
                        )}
                        <div className="flex items-center gap-3 px-4">
                            <UserAvatar image={imageOf(me)} size={32} />
                            <span className="font-semibold">{me}</span>
                            <RoleBadge action={player.action} turned={player.turned} place={placeOf(me)} />
                        </div>
                        {/*
                         * The hand stays in the middle of the table, between a column for sorting it, under
                         * the deck, so that it stays put however many cards the player holds, and one for
                         * the card that ends the player's round.
                         */}
                        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(var(--card-w),1fr)_minmax(0,auto)_minmax(var(--card-w),1fr)] items-end px-4">
                            <div className="flex w-(--card-w) justify-center justify-self-start pb-6">
                                <SortControl sort={arranged ? null : byRank ? "rank" : "suit"} onSort={sortBy} />
                            </div>
                            <PlayerHand
                                cards={hand}
                                playable={playable}
                                selected={selected}
                                active={mustAct}
                                pickedUp={pickedUp}
                                drawn={draws.drawn}
                                trumpSuit={trump.suit}
                                onPick={pick}
                            />
                            <div className="justify-self-start pb-6 pl-4 sm:pl-10">
                                {canForfeit(view) && !pending && (
                                    <ActionCard
                                        {...(player.action === "defend"
                                            ? {
                                                  icon: Hand,
                                                  label: "Take",
                                                  description: "Take the cards",
                                                  tone: "danger",
                                              }
                                            : { icon: Check, label: "Done", description: "Done adding cards" })}
                                        timeout={waitingOnMe ? DONE_TIMEOUT_SECONDS : undefined}
                                        // A change on the table starts the time again.
                                        timing={roundState}
                                        onClick={() => play({ type: "forfeit" })}
                                    />
                                )}
                            </div>
                        </div>
                    </section>

                    <CardFlights
                        flights={flights}
                        onLanded={(id) => setFlights((current) => current.filter((flight) => flight.id !== id))}
                    />
                    <DragOverlay dropAnimation={null}>
                        {dragging && <PlayingCard card={dragging} className="rotate-6 shadow-2xl" />}
                    </DragOverlay>
                </div>
            </LayoutGroup>
        </DndContext>
    );
}

/** What the player can do now, in a sentence, as a hint for players who want one. */
function describeTurn(turn: Turn, { canPass, tableClear }: { canPass: boolean; tableClear: boolean }): string {
    switch (turn.kind) {
        case "out":
            return "You're out of cards. Watch the rest play out.";
        case "lead":
            return "Your attack. Play any card.";
        case "attack":
            return "Add a card of a rank on the table, or say you're done.";
        case "attackDone":
            return "You're done. Waiting for the others.";
        case "defend":
            return canPass
                ? "Beat each card, pass the attack on with the same rank, or take the cards."
                : "Beat each card, or take the cards.";
        case "taking":
            return "You're taking the cards. The attackers can still add some.";
        case "defended":
            return tableClear ? "Waiting for the attack." : "Everything's beaten. Waiting for the attackers.";
        case "wait":
            return turn.attacker && turn.defender
                ? `${turn.attacker} is attacking ${turn.defender}. You can add cards once ${turn.attacker} is done.`
                : "Waiting for the next round.";
    }
}
