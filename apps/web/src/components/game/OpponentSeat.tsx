import { motion } from "framer-motion";

import PlayingCard from "@/components/game/PlayingCard";
import RoleBadge from "@/components/game/RoleBadge";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { range } from "@/utils";
import { handSize } from "@durachok/engine";
import { OpaquePlayerState } from "@durachok/transport";

/** How many of a player's cards to draw, after which their count says the rest. */
const SHOWN_CARDS = 8;

/** How many cards to draw for a hand whose size nobody is told, in mythic mode. */
const SECRET_HAND = 4;

type Props = {
    player: OpaquePlayerState;
    /** The player's profile picture, if they have one. */
    image?: string;
    /** The player's place, once they're out of the game. */
    place?: number;
    /** Show the player's whole hand, for a player who can see it. Without it, the seat isn't a button. */
    onShowCards?: () => void;
};

/** Another player at the table: who they are, how many cards they hold, and what they're doing. */
export default function OpponentSeat({ player, image, place, onShowCards }: Props) {
    const count = handSize(player);
    const shown = count === null ? SECRET_HAND : Math.min(count, SHOWN_CARDS);
    const inRound = player.out === null && player.action !== "none" && !player.turned;

    const content = (
        <>
            <div className="flex items-center gap-2">
                <UserAvatar image={image} size={28} />
                <span className="max-w-28 truncate text-sm font-semibold">{player.name}</span>
            </div>
            {/* Small cards, face up for a player who is out of the game and may see them. */}
            <div data-seat={player.name} className="flex h-[calc(var(--card-w)*1.4)] items-center [--card-w:22px]">
                {range(shown).map((position) => (
                    <PlayingCard
                        key={position}
                        card={player.deck.type === "visible" ? player.deck.cards[position] : undefined}
                        className={cn("shadow-sm", position > 0 && "-ml-3.5")}
                        aria-hidden="true"
                    />
                ))}
                {count === null ? (
                    <span className="sr-only">Cards, how many isn't told</span>
                ) : (
                    <span className="ml-2 text-sm font-semibold tabular-nums text-muted-foreground">
                        {count}
                        <span className="sr-only"> {count === 1 ? "card" : "cards"}</span>
                    </span>
                )}
            </div>
            <RoleBadge action={player.action} turned={player.turned} place={place} />
        </>
    );

    return (
        <motion.li
            layout
            className={cn(
                "flex min-w-32 flex-col items-center gap-2 rounded-xl border bg-card/80 px-3 py-2 shadow-sm backdrop-blur-sm transition-shadow",
                inRound && player.action === "attack" && "border-amber-400/60",
                inRound && player.action === "defend" && "border-sky-400/60",
                player.out !== null && "opacity-70",
            )}
        >
            {onShowCards ? (
                <button
                    type="button"
                    onClick={onShowCards}
                    title={`See ${player.name}'s cards`}
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-lg transition-transform hover:-translate-y-0.5"
                >
                    {content}
                </button>
            ) : (
                content
            )}
        </motion.li>
    );
}
