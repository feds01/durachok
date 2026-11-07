import { Check, Hand, Shield, Swords, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { PlayerRole } from "@durachok/transport";

type Props = {
    action: PlayerRole;
    /** Whether the player is done with the round: an attacker is done adding, and the defender takes the cards. */
    turned: boolean;
    /** The player's place, once they're out of the game. */
    place?: number;
    className?: string;
};

const ORDINALS = ["1st", "2nd", "3rd"];

/** What a player is doing in the round, or their place once they're out of the game. */
export default function RoleBadge({ action, turned, place, className }: Props) {
    const badge = (() => {
        if (place !== undefined) {
            return {
                icon: Trophy,
                label: `Out · ${ORDINALS[place - 1] ?? `${place}th`}`,
                tone: "bg-emerald-400/15 text-emerald-300",
            };
        }
        switch (action) {
            case "attack":
                return turned
                    ? { icon: Check, label: "Done", tone: "bg-secondary text-muted-foreground" }
                    : { icon: Swords, label: "Attacking", tone: "bg-amber-400/15 text-amber-300" };
            case "defend":
                return turned
                    ? { icon: Hand, label: "Taking", tone: "bg-rose-400/15 text-rose-300" }
                    : { icon: Shield, label: "Defending", tone: "bg-sky-400/15 text-sky-300" };
            case "none":
                return null;
        }
    })();

    if (!badge) {
        return null;
    }

    const Icon = badge.icon;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
                badge.tone,
                className,
            )}
        >
            <Icon className="size-3.5" aria-hidden="true" />
            {badge.label}
        </span>
    );
}
