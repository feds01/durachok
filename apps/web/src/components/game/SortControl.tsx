import { ArrowUpNarrowWide, LucideIcon, Spade } from "lucide-react";

import { cn } from "@/lib/utils";
import { HandSort } from "@durachok/engine";

const OPTIONS: { by: HandSort; icon: LucideIcon; label: string }[] = [
    { by: "suit", icon: Spade, label: "Suit" },
    { by: "rank", icon: ArrowUpNarrowWide, label: "Rank" },
];

type Props = {
    /** What the cards are sorted by, or nothing once the player arranged them by hand. */
    sort: HandSort | null;
    onSort: (by: HandSort) => void;
};

/** Sorts the player's cards by suit or by rank, which also undoes the order they arranged them in. */
export default function SortControl({ sort, onSort }: Props) {
    return (
        <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
            <legend className="sr-only">Sort your cards</legend>
            {OPTIONS.map(({ by, icon: Icon, label }) => (
                <button
                    key={by}
                    type="button"
                    onClick={() => onSort(by)}
                    aria-pressed={sort === by}
                    aria-label={`Sort by ${by}`}
                    title={`Sort by ${by}`}
                    className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        sort === by
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                >
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="max-sm:hidden">{label}</span>
                </button>
            ))}
        </fieldset>
    );
}
