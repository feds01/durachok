import { Crown } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { VictoryMessage } from "@durachok/transport";

type Props = {
    /** The players in the order that they went out, so the first won. */
    results: VictoryMessage["players"];
    /** The player's own name. */
    me: string | null;
    onClose: () => void;
};

/**
 * How the game ended, over the waiting room that the players return to: who went out first
 * and won, and who was left holding cards, the durak.
 */
export default function GameResults({ results, me, onClose }: Props) {
    const last = results.at(-1);
    // The player left with cards never went out. When the last players go out together, nobody is.
    const durak = last && last.out === null ? last.name : null;
    const winner = results[0]?.name;
    const lost = durak !== null && durak === me;

    useEffect(() => playSound(lost ? "defeat" : "victory"), [lost]);

    const title = winner === me ? "You won!" : lost ? "You're the durak" : `${winner} won`;
    const description =
        durak === null
            ? "Everyone went out, so nobody is the durak this time."
            : `${durak === me ? "You were" : `${durak} was`} left holding cards.`;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="border-border bg-card sm:max-w-md">
                <DialogHeader className="items-center text-center sm:text-center">
                    <DialogTitle className="text-3xl text-foreground">{title}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">{description}</DialogDescription>
                </DialogHeader>
                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                    {results.map(({ name }, index) => (
                        <li
                            key={name}
                            className={cn(
                                "flex items-center gap-3 rounded-lg border px-3 py-2",
                                name === me && "border-primary/60 bg-primary/10",
                            )}
                        >
                            <span className="w-6 font-display text-xl font-bold lining-nums text-muted-foreground">
                                {index + 1}
                            </span>
                            <span className="flex-1 truncate font-semibold">{name}</span>
                            {index === 0 && <Crown className="size-5 text-amber-300" aria-label="Winner" />}
                            {name === durak && (
                                <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-rose-300">
                                    Durak
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
                <Button onClick={onClose}>Back to the lobby</Button>
            </DialogContent>
        </Dialog>
    );
}
