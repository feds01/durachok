import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
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
import CardFlights from "@/components/game/CardFlights";
import HandsDialog from "@/components/game/HandsDialog";
import PlayerHand from "@/components/game/Hand";
import OpponentSeat from "@/components/game/OpponentSeat";
import { DeckPile, DiscardPile } from "@/components/game/Piles";
import PlayingCard from "@/components/game/PlayingCard";
import RemovePlayerDialog from "@/components/game/RemovePlayerDialog";
import RoleBadge from "@/components/game/RoleBadge";
import RoundAnnouncement from "@/components/game/RoundAnnouncement";
import SortControl from "@/components/game/SortControl";
import TableArea, { Targets } from "@/components/game/TableArea";
import { Button } from "@/components/ui/button";
import { useLobbyStore } from "@/contexts/lobby";
import { useRoundAnnouncement } from "@/lib/announcement";
import { useDeal } from "@/lib/deal";
import { collisionDetection } from "@/lib/drag";
import { usePreference } from "@/lib/preferences";
import { playSound } from "@/lib/sound";
import { CardSources, readActions } from "@/lib/table";
import { cn } from "@/lib/utils";
import { expr } from "@/utils";
import {
    HandSort,
    Turn,
    applyMove,
    arrangeHand,
    canCover,
    canForfeit,
    canPlace,
    movesFor,
    placesOf,
    suitOf,
    tableCards,
    turnOf,
    visibleHands,
} from "@durachok/engine";
import { Lobby, PlayerGameState, PlayerMove } from "@durachok/transport";

type Props = {
    lobby: Lobby;
    game: PlayerGameState;
    /** Whether the player owns the lobby, and so may remove another player from the game. */
    isOwner: boolean;
};

/** How long the round waits on an attacker before it takes them as done, in seconds. */
const DONE_TIMEOUT_SECONDS = 8;

/**
 * The game, as the player sees it: the other players along the top, the deck, the table and
 * the discarded cards across the middle, and the player's own cards along the bottom. The
 * engine says what the player can do, and the table shows it.
 */
export default function GameTable({ lobby, game, isOwner }: Props) {
    const { pending, actions, dispatchMove, kick } = useLobbyStore(
        useShallow((state) => ({
            pending: state.pending,
            actions: state.actions,
            dispatchMove: state.dispatchMove,
            kick: state.kick,
        })),
    );
    // The player whom the owner asked to remove from the game, until they confirm it.
    const [removing, setRemoving] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dropped, setDropped] = useState<string | null>(null);
    const [muted, setMuted] = usePreference("muted");
    const [hints, setHints] = usePreference("hints");
    const [byRank, setByRank] = usePreference("sortByRank");
    // The order that the player put their cards in by hand, until they sort them again.
    const [arranged, setArranged] = useState<string[] | null>(null);
    // The player whose cards a player who is out of the game asked to see.
    const [shownHand, setShownHand] = useState<string | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    // The server's view, as the player's own move doesn't change their role or clear the table.
    const [announcement, dismissAnnouncement] = useRoundAnnouncement(game);

    // The player sees their move straight away, until the server answers it.
    const view = useMemo(() => (pending ? applyMove(game, pending) : game), [game, pending]);
    const { player, players, trump } = view;
    const me = player.name;
    const table = tableCards(view);
    const turn = turnOf(view);
    // Once out of the game, the player can see the hands still in it, the one they clicked first.
    const seenHands = visibleHands(view, shownHand ?? undefined);
    const hand = useMemo(
        () => arrangeHand(player.deck, trump.suit, byRank ? "rank" : "suit", arranged),
        [player.deck, trump.suit, byRank, arranged],
    );
    // Nothing more can be played until the server answers the last move.
    const playable = useMemo(
        () => new Set(pending ? [] : hand.filter((card) => movesFor(view, card).length > 0)),
        [hand, view, pending],
    );

    // The last update says where the table's cards came from, and where they go when it clears.
    const update = readActions(actions, me);
    const sources: CardSources = {
        fromHand: new Set([...(pending && pending.type !== "forfeit" ? [pending.card] : []), ...update.mine]),
        dropped,
        playedBy: update.playedBy,
        trumpSuit: trump.suit,
    };
    const deal = useDeal(game, update);

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

    // A card that can't be played now, as while the server hasn't answered the last move, can
    // only be moved along the hand.
    const holding = dragging && playable.has(dragging) ? dragging : selected;
    const targets: Targets | null = holding
        ? {
              place: canPlace(view, holding),
              cover: new Set(table.flatMap((_, position) => (canCover(view, holding, position) ? [position] : []))),
          }
        : null;

    // What the hand is sorted by, or nothing once the player arranged it themselves.
    const sortedBy = expr((): HandSort | null => {
        if (arranged) {
            return null;
        }
        return byRank ? "rank" : "suit";
    });

    const sortBy = (by: HandSort) => {
        setByRank(by === "rank");
        setArranged(null);
    };

    const play = (move: PlayerMove) => {
        setSelected(null);
        deal.forgetDrawn();
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

        const move = expr((): PlayerMove | null => {
            // Only a card that can be played now goes on the table: not while the server hasn't answered.
            if (!playable.has(card)) {
                return null;
            }
            if (target === "table" && canPlace(view, card)) {
                return { type: "place", card };
            }
            if (target.startsWith("slot-") && canCover(view, card, position)) {
                return { type: "cover", card, position };
            }
            return null;
        });

        if (move) {
            setDropped(card);
            play(move);
        }
    };

    // The players who are out, by the order they went out, which is their place.
    const places = placesOf([player, ...players]);
    const placeOf = (name: string) => places.get(name);
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
                                place={places.get(other.name)}
                                onShowCards={
                                    seenHands.some(({ name }) => name === other.name)
                                        ? () => setShownHand(other.name)
                                        : undefined
                                }
                                {...(isOwner && !other.removed && { onRemove: () => setRemoving(other.name) })}
                            />
                        ))}
                    </ul>
                    <RemovePlayerDialog
                        player={removing}
                        onConfirm={(name) => {
                            setRemoving(null);
                            kick(name);
                        }}
                        onClose={() => setRemoving(null)}
                    />
                    <HandsDialog
                        hands={seenHands}
                        focus={shownHand}
                        trumpSuit={trump.suit}
                        imageOf={imageOf}
                        onClose={() => setShownHand(null)}
                    />

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
                                clearTo={update.clearTo}
                                sources={sources}
                                onPlace={() => holding && play({ type: "place", card: holding })}
                                onCover={(position) => holding && play({ type: "cover", card: holding, position })}
                            />
                            <RoundAnnouncement
                                announcement={announcement}
                                overCards={table.length > 0}
                                onDone={dismissAnnouncement}
                            />
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
                            <RoleBadge action={player.action} turned={player.turned} place={places.get(me)} />
                        </div>
                        {/* Out of the game, the player can look at the hands still in it, whether or not hints are on. */}
                        {seenHands.length > 0 && (
                            <p className="m-0 text-sm text-muted-foreground">Click a player to see their cards.</p>
                        )}
                        {/*
                         * The hand stays in the middle of the table, between a column for sorting it, under
                         * the deck, so that it stays put however many cards the player holds, and one for
                         * the card that ends the player's round.
                         */}
                        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(var(--card-w),1fr)_minmax(0,auto)_minmax(var(--card-w),1fr)] items-end px-4">
                            <div className="flex w-(--card-w) justify-center justify-self-start pb-6">
                                <SortControl sort={sortedBy} onSort={sortBy} />
                            </div>
                            <PlayerHand
                                cards={hand}
                                playable={playable}
                                selected={selected}
                                active={mustAct}
                                drawn={deal.drawn}
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

                    <CardFlights flights={deal.flights} onLanded={deal.landed} />
                    <DragOverlay dropAnimation={null}>
                        {dragging && (
                            <PlayingCard
                                card={dragging}
                                trump={suitOf(dragging) === trump.suit}
                                className="rotate-6 shadow-2xl"
                            />
                        )}
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
