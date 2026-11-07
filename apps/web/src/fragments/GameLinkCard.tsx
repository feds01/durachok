import { ArrowRight, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PANEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import trpc from "@/utils/trpc";
import { Link } from "@tanstack/react-router";

type GameStatus = "waiting" | "playing" | "finished";

type Props = {
    pin: string;
    status: GameStatus;
    players: number;
    maxPlayers: number;
};

const STATUSES: Record<GameStatus, { label: string; className: string }> = {
    waiting: { label: "Waiting", className: "bg-amber-400/15 text-amber-300" },
    playing: { label: "Playing", className: "bg-emerald-400/15 text-emerald-300" },
    finished: { label: "Finished", className: "bg-secondary text-muted-foreground" },
};

/** One of the user's lobbies on their dashboard, with a way into it and a way to delete it. */
export default function GameLinkCard({ pin, status, players, maxPlayers }: Props) {
    const utils = trpc.useUtils();
    // The deleted lobby leaves the user's lobbies on the dashboard.
    const deleteGame = trpc.lobbies.delete.useMutation({ onSuccess: () => utils.users.get.invalidate() });

    return (
        // The open link stretches over the whole card, so a click anywhere on it opens the lobby.
        <div
            className={cn(
                PANEL,
                "relative flex flex-col gap-4 transition-[translate,border-color] hover:-translate-y-1 hover:border-primary/60",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="m-0 text-xs uppercase tracking-[0.25em] text-muted-foreground">Lobby</p>
                    <p className="m-0 font-display text-4xl font-black italic lining-nums tracking-wider">{pin}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUSES[status].className)}>
                    {STATUSES[status].label}
                </span>
            </div>
            <p className="m-0 flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" aria-hidden="true" />
                {players} / {maxPlayers} players
            </p>
            <div className="flex items-center gap-2">
                <Button asChild className="flex-1">
                    <Link
                        to="/lobby/$pin"
                        params={{ pin }}
                        aria-label={`Open lobby ${pin}`}
                        className="after:absolute after:inset-0 after:rounded-2xl"
                    >
                        Open
                        <ArrowRight />
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteGame.mutate({ pin })}
                    disabled={deleteGame.isPending}
                    aria-label={`Delete lobby ${pin}`}
                    title="Delete"
                    // Above the stretched link, so that it deletes the lobby rather than opening it.
                    className="relative z-10 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                >
                    <Trash2 />
                </Button>
            </div>
        </div>
    );
}
