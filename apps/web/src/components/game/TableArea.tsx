import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, Variants, motion } from "framer-motion";

import PlayingCard from "@/components/game/PlayingCard";
import { cardName } from "@/lib/cards";
import { cn } from "@/lib/utils";
import { TableCard } from "@durachok/engine";

/** Where the cards on the table go when it clears. */
export type ClearTo =
    /** The defender beat them all, so they're discarded. */
    | "discard"
    /** The player took them, so they fly into their hand. */
    | "hand"
    /** Another player took them. */
    | "away";

/** Where the card that the player holds up, by clicking or dragging it, can go. */
export type Targets = {
    /** Onto the table, to attack or to pass the attack on. */
    place: boolean;
    /** The positions of the attacks that it beats. */
    cover: ReadonlySet<number>;
};

type Props = {
    cards: TableCard[];
    targets: Targets | null;
    /** Whether the player is defending, which says what placing a card does. */
    defending: boolean;
    clearTo: ClearTo;
    /** Cards that the player just played, which fly from their hand rather than drop in from another player. */
    fromHand: ReadonlySet<string>;
    /** The card that the player dropped onto the table, which lands where they let go of it. */
    dropped: string | null;
    onPlace: () => void;
    onCover: (position: number) => void;
};

const leave: Variants = {
    exit: (clearTo: ClearTo) => {
        switch (clearTo) {
            case "discard":
                return { x: "45vw", rotate: 40, opacity: 0, transition: { duration: 0.45, ease: "easeIn" } };
            case "away":
                return { y: "-35vh", scale: 0.6, opacity: 0, transition: { duration: 0.4, ease: "easeIn" } };
            case "hand":
                // The cards in the player's hand take over, and fly in from here.
                return { opacity: 0, transition: { duration: 0 } };
        }
    },
};

/** The middle of the table: the attacks, each with the card that beat it, in the order they were played. */
export default function TableArea({ cards, targets, defending, clearTo, fromHand, dropped, onPlace, onCover }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: "table", disabled: !targets?.place });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "relative flex min-h-[calc(var(--card-w)*1.9)] w-full flex-wrap content-center items-center justify-center gap-x-4 gap-y-3 rounded-3xl border-2 border-dashed border-transparent p-4 transition-colors",
                targets?.place && "border-primary/50 bg-primary/5",
                isOver && "border-primary bg-primary/10",
            )}
        >
            <AnimatePresence custom={clearTo}>
                {cards.map((pair, position) => (
                    <motion.div
                        key={pair.card}
                        layout
                        variants={leave}
                        exit="exit"
                        className="relative h-[calc(var(--card-w)*1.4*1.18)] w-[calc(var(--card-w)*1.45)]"
                    >
                        <Attack
                            pair={pair}
                            position={position}
                            target={targets?.cover.has(position) ?? false}
                            fromHand={fromHand}
                            dropped={dropped}
                            onCover={onCover}
                        />
                    </motion.div>
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

type AttackProps = {
    pair: TableCard;
    position: number;
    /** Whether the card that the player holds up beats this attack. */
    target: boolean;
    fromHand: ReadonlySet<string>;
    dropped: string | null;
    onCover: (position: number) => void;
};

/** A card on the table, with the card that beat it on top. */
function Attack({ pair, position, target, fromHand, dropped, onCover }: AttackProps) {
    const { setNodeRef, isOver } = useDroppable({ id: `slot-${position}`, disabled: !target });

    return (
        <>
            <div ref={setNodeRef} className="absolute left-0 top-0">
                <TableCardView card={pair.card} fromHand={fromHand} dropped={dropped} />
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
                    <TableCardView card={pair.coveredBy} fromHand={fromHand} dropped={dropped} />
                </div>
            )}
        </>
    );
}

type TableCardViewProps = { card: string; fromHand: ReadonlySet<string>; dropped: string | null };

/**
 * A card as it arrives on the table: from the player's hand it flies over from there, and
 * where the player dropped it, it settles. Another player's card drops in from their side.
 */
function TableCardView({ card, fromHand, dropped }: TableCardViewProps) {
    if (card === dropped) {
        return <PlayingCard card={card} initial={{ scale: 1.08 }} animate={{ scale: 1 }} />;
    }

    return (
        <PlayingCard
            card={card}
            layoutId={card}
            initial={fromHand.has(card) ? false : { opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
    );
}
