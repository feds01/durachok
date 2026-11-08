import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion, useAnimate, usePresence, usePresenceData } from "framer-motion";
import { ReactNode, useEffect, useRef } from "react";

import PlayingCard from "@/components/game/PlayingCard";
import { AWAY, DISCARD, offsetTo, pileLean, seatOf, useArrival } from "@/lib/flight";
import { cn } from "@/lib/utils";
import { cardName, suitOf, TableCard } from "@durachok/engine";
import { PlayerRole } from "@durachok/transport";

/** Where the cards on the table go as it clears at the end of a round. */
export type ClearTo =
    /** The defender beat them all, so they're discarded. */
    | { to: "discard" }
    /** The player took them, so they fly into their hand. */
    | { to: "hand" }
    /** Another player took them, so they fly to their seat. */
    | { to: "seat"; player: string };

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

/** Where the card that the player holds up, by clicking or dragging it, can go. */
export type Targets = {
    /** Onto the table, to attack or to pass the attack on. */
    place: boolean;
    /** The positions of the attacks that it beats. */
    cover: ReadonlySet<number>;
};

type Props = {
    cards: TableCard[];
    /** The player's role in the round, which tints the table. */
    role: PlayerRole;
    targets: Targets | null;
    /** Whether the player is defending, which says what placing a card does. */
    defending: boolean;
    /** Where the table's cards go, if the last update clears the table, or nothing while the round goes on. */
    clearTo: ClearTo | null;
    sources: CardSources;
    onPlace: () => void;
    onCover: (position: number) => void;
};

/** The middle of the table: the attacks, each with the card that beat it, in the order they were played. */
export default function TableArea({ cards, role, targets, defending, clearTo, sources, onPlace, onCover }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: "table", disabled: !targets?.place });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "relative flex min-h-[calc(var(--card-w)*1.9)] w-full flex-wrap content-center items-center justify-center gap-x-4 gap-y-3 rounded-3xl border-2 border-dashed border-transparent p-4 ring-2 ring-transparent transition-[border-color,background-color,box-shadow]",
                role === "attack" && "bg-amber-400/5 ring-amber-400/30",
                role === "defend" && "bg-sky-400/5 ring-sky-400/30",
                targets?.place && "border-primary/50 bg-primary/5",
                isOver && "border-primary bg-primary/10",
            )}
        >
            <AnimatePresence custom={clearTo}>
                {cards.map((pair, position) => (
                    <AttackSlot key={pair.card} position={position}>
                        <Attack
                            pair={pair}
                            position={position}
                            target={targets?.cover.has(position) ?? false}
                            sources={sources}
                            onCover={onCover}
                        />
                    </AttackSlot>
                ))}
            </AnimatePresence>
            {targets?.place && (
                <button
                    type="button"
                    onClick={onPlace}
                    data-target="place"
                    className="flex aspect-5/7 w-(--card-w) cursor-pointer items-center justify-center rounded-[5%/3.6%] border-2 border-dashed border-primary/70 bg-primary/10 p-2 text-center text-xs font-semibold text-foreground transition-colors hover:bg-primary/20"
                >
                    {defending ? "Pass it on" : cards.length === 0 ? "Attack" : "Add"}
                </button>
            )}
            {cards.length === 0 && !targets?.place && <p className="m-0 text-muted-foreground">The table is clear.</p>}
        </div>
    );
}

/**
 * An attack's place on the table, which flies away with its cards as the table clears: onto
 * the discard pile, or to the player who took them, one after another. Cards that the player
 * took fly into their hand from where they lie, and so does a card that the server turned down.
 */
function AttackSlot({ position, children }: { position: number; children: ReactNode }) {
    const [isPresent, safeToRemove] = usePresence();
    // Where the table's cards go, as the table says when it clears, after this attack last rendered.
    const clearTo = usePresenceData() as ClearTo | null | undefined;
    const [scope, animate] = useAnimate<HTMLDivElement>();
    const leaving = useRef<{ stop: () => void } | null>(null);

    useEffect(() => {
        const element = scope.current;

        // An attack that comes back as it leaves, as when the server answers the player's move
        // after another update, stays on the table.
        if (isPresent) {
            if (leaving.current && element) {
                leaving.current.stop();
                leaving.current = null;
                void animate(element, { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }, { duration: 0 });
            }
            return;
        }

        const place =
            clearTo?.to === "discard"
                ? document.querySelector(DISCARD)
                : clearTo?.to === "seat"
                  ? document.querySelector(seatOf(clearTo.player))
                  : null;
        if (!element || !place) {
            safeToRemove();
            return;
        }

        const { x, y, scale } = offsetTo(element.firstElementChild ?? element, place);
        const rotate = clearTo?.to === "discard" ? pileLean(position) : 0;
        const flight = animate(
            element,
            { x, y, scale, rotate, opacity: [1, 1, 0] },
            { ...AWAY, delay: position * 0.06 },
        );
        leaving.current = flight;
        void flight.then(() => {
            if (leaving.current === flight) {
                leaving.current = null;
                safeToRemove();
            }
        });
        // Once, as the attack leaves.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the exit is once
    }, [isPresent]);

    return (
        <motion.div
            ref={scope}
            layout
            className="relative h-[calc(var(--card-w)*1.4*1.18)] w-[calc(var(--card-w)*1.45)]"
            // The attacking card's middle, which lands on the place that the cards fly to.
            style={{ transformOrigin: "calc(var(--card-w) * 0.5) calc(var(--card-w) * 0.7)" }}
        >
            {children}
        </motion.div>
    );
}

type AttackProps = {
    pair: TableCard;
    position: number;
    /** Whether the card that the player holds up beats this attack. */
    target: boolean;
    sources: CardSources;
    onCover: (position: number) => void;
};

/** A card on the table, with the card that beat it on top. */
function Attack({ pair, position, target, sources, onCover }: AttackProps) {
    const { setNodeRef, isOver } = useDroppable({ id: `slot-${position}`, disabled: !target });

    return (
        <>
            <div ref={setNodeRef} className="absolute left-0 top-0">
                <TableCardView card={pair.card} sources={sources} />
                {target && (
                    <button
                        type="button"
                        onClick={() => onCover(position)}
                        aria-label={`Beat the ${cardName(pair.card)}`}
                        data-target={`cover-${position}`}
                        className={cn(
                            "absolute inset-0 cursor-pointer rounded-[5%/3.6%] p-0 ring-4 ring-primary/70 transition-shadow hover:ring-primary",
                            isOver && "ring-primary bg-primary/20",
                        )}
                    />
                )}
            </div>
            {pair.coveredBy && (
                <div className="absolute left-[calc(var(--card-w)*0.3)] top-[calc(var(--card-w)*1.4*0.18)] rotate-[8deg]">
                    <TableCardView card={pair.coveredBy} sources={sources} tilt={8} />
                </div>
            )}
        </>
    );
}

type TableCardViewProps = {
    card: string;
    sources: CardSources;
    /** How far the card is turned, in degrees, which its flight in makes up for. */
    tilt?: number;
};

/**
 * A card as it arrives on the table: from the player's hand it flies over from there, and
 * where the player dropped it, it settles. Another player's card flies in from their seat,
 * and a card from before, as when the player comes back to the game, drops in.
 */
function TableCardView({ card, sources, tilt = 0 }: TableCardViewProps) {
    const trump = suitOf(card) === sources.trumpSuit;
    const player = sources.playedBy.get(card);
    const arrival = useArrival<HTMLDivElement>(player ? seatOf(player) : null, { tilt });

    // The same wrapper whichever way the card came, so that it stays put as later updates say less about it.
    return (
        <div ref={arrival}>
            {card === sources.dropped ? (
                <PlayingCard card={card} trump={trump} initial={{ scale: 1.08 }} animate={{ scale: 1 }} />
            ) : (
                <PlayingCard
                    card={card}
                    trump={trump}
                    layoutId={card}
                    initial={sources.fromHand.has(card) || player ? false : { opacity: 0, y: -60, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
            )}
        </div>
    );
}
