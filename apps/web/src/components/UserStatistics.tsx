import { UserStatistics as Statistics } from "@durachok/transport";

import { statisticTiles } from "@/lib/statistics";
import { PANEL } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Props = {
    statistics: Statistics;
};

/** The player's record on their dashboard, @see statisticTiles. */
export default function UserStatistics({ statistics }: Props) {
    return (
        <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {statisticTiles(statistics).map(({ label, value }) => (
                <div key={label} className={cn(PANEL, "flex flex-col-reverse gap-1")}>
                    <dt className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</dt>
                    <dd className="m-0 font-display text-4xl font-black italic lining-nums tracking-wider">{value}</dd>
                </div>
            ))}
        </dl>
    );
}
