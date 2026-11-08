import {
    CollisionDetection,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    pointerWithin,
    rectIntersection,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { LayoutGroup } from "framer-motion";
import { Check, Hand, Lightbulb, LightbulbOff, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import Logo from "@/components/Logo";
import UserAvatar from "@/components/UserAvatar";
import ActionCard from "@/components/game/ActionCard";
import PlayerHand from "@/components/game/Hand";
import OpponentSeat from "@/components/game/OpponentSeat";
import { DeckPile, DiscardPile } from "@/components/game/Piles";
import PlayingCard from "@/components/game/PlayingCard";
import RoleBadge from "@/components/game/RoleBadge";
import TableArea, { ClearTo, Targets } from "@/components/game/TableArea";
import { Button } from "@/components/ui/button";
import { useLobbyStore } from "@/contexts/lobby";
import { usePreference } from "@/lib/preferences";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import {
    Turn,
    applyMove,
    canCover,
    canForfeit,
    canPlace,
    isRedSuit,
    movesFor,
    sortHand,
    suitName,
    suitSymbol,
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

/** Prefer the attack that a dragged card is over to the table around it. */
const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const attack = hits.find(({ id }) => String(id).startsWith("slot-"));

    if (attack) {
        return [attack];
    }
    return hits.length > 0 ? hits : rectIntersection(args);
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
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    // The player sees their move straight away, until the server answers it.
    const view = useMemo(() => (pending ? applyMove(game, pending) : game), [game, pending]);
    const { player, players, trump } = view;
    const me = player.name;
    const table = tableCards(view);
    const turn = turnOf(view);
    const hand = useMemo(() => sortHand(player.deck, trump.suit), [player.deck, trump.suit]);
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
    const clearTo: ClearTo = !pickup ? "discard" : pickup.player === me ? "hand" : "away";
    const pickedUp = new Set(pickup?.player === me ? pickup.cards : []);

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

    const play = (move: PlayerMove) => {
        setSelected(null);
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
                            <span
                                className="flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-sm font-semibold"
                                aria-label={`Trumps are ${suitName(trump.suit)}`}
                            >
                                Trumps
                                <span
                                    className={cn("text-lg leading-none", isRedSuit(trump.suit) && "text-rose-400")}
                                    aria-hidden="true"
                                >
                                    {suitSymbol(trump.suit)}
                                </span>
                            </span>
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

                    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-2 items-center gap-4 px-4 py-4 sm:grid-cols-[auto_1fr_auto]">
                        <div className="justify-self-start">
                            <DeckPile size={view.deckSize} trump={trump} />
                        </div>
                        <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                            <TableArea
                                cards={table}
                                targets={targets}
                                defending={player.action === "defend"}
                                clearTo={clearTo}
                                fromHand={fromHand}
                                dropped={dropped}
                                onPlace={() => holding && play({ type: "place", card: holding })}
                                onCover={(position) => holding && play({ type: "cover", card: holding, position })}
                            />
                        </div>
                        <div className="justify-self-end">
                            <DiscardPile count={view.discardSize} />
                        </div>
                    </div>

                    {/* A hint keeps its height as its text changes, so the table stays put. */}
                    <section aria-label="You" className="flex flex-col items-center gap-2 px-4">
                        <div className="flex items-center gap-3">
                            <UserAvatar image={imageOf(me)} size={32} />
                            <span className="font-semibold">{me}</span>
                            <RoleBadge action={player.action} turned={player.turned} place={placeOf(me)} />
                        </div>
                        {hints && (
                            <p
                                className={cn(
                                    "m-0 flex min-h-12 max-w-xl items-center text-center",
                                    mustAct ? "font-semibold text-foreground" : "text-muted-foreground",
                                )}
                                aria-live="polite"
                            >
                                {describeTurn(turn, { canPass })}
                            </p>
                        )}
                        {/* The hand stays in the middle, with a column either side for the card that ends the player's round. */}
                        <div className="grid w-full grid-cols-[minmax(var(--card-w),1fr)_minmax(0,auto)_minmax(var(--card-w),1fr)] items-end">
                            <span aria-hidden="true" />
                            <PlayerHand
                                cards={hand}
                                playable={playable}
                                selected={selected}
                                active={mustAct}
                                pickedUp={pickedUp}
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

                    <DragOverlay dropAnimation={null}>
                        {dragging && <PlayingCard card={dragging} className="rotate-6 shadow-2xl" />}
                    </DragOverlay>
                </div>
            </LayoutGroup>
        </DndContext>
    );
}

/** What the player can do now, in a sentence, as a hint for players who want one. */
function describeTurn(turn: Turn, { canPass }: { canPass: boolean }): string {
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
            return "Everything's beaten. Waiting for the attackers.";
        case "wait":
            return turn.attacker && turn.defender
                ? `${turn.attacker} is attacking ${turn.defender}. You can add cards once ${turn.attacker} is done.`
                : "Waiting for the next round.";
    }
}
