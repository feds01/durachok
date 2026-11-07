import { DoorOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CloseReason } from "@/contexts/lobby";
import { Link } from "@tanstack/react-router";

const REASONS: Record<CloseReason, { title: string; message: string; canRejoin: boolean }> = {
    kicked: {
        title: "You were removed from the lobby",
        message: "The owner removed you from this lobby.",
        canRejoin: false,
    },
    lobby_closed: {
        title: "The lobby closed",
        message: "The owner deleted this lobby.",
        canRejoin: false,
    },
    stale_token: {
        title: "Your place in the lobby is gone",
        message: "A player who disconnects before the game starts gives up their place. Join again to get back in.",
        canRejoin: true,
    },
    unauthorized: {
        title: "You aren't in this lobby",
        message: "Your session for this lobby has expired. Join it again to get back in.",
        canRejoin: true,
    },
    disconnected: {
        title: "Lost the connection",
        message: "The connection to the lobby dropped, and couldn't be restored.",
        canRejoin: true,
    },
    left: {
        title: "You left the lobby",
        message: "Join it again whenever you like.",
        canRejoin: true,
    },
};

type Props = {
    pin: string;
    reason: CloseReason;
};

/** Shown once the client is no longer in the lobby, with why. */
export default function LobbyClosed({ pin, reason }: Props) {
    const { title, message, canRejoin } = REASONS[reason];

    return (
        <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
            <DoorOpen className="size-12 text-muted-foreground" />
            <h1 className="m-0 text-3xl">{title}</h1>
            <p className="m-0 font-body text-muted-foreground">{message}</p>
            <div className="flex gap-2">
                {canRejoin && (
                    <Button asChild>
                        <Link to="/" search={{ startPin: pin }}>
                            Join again
                        </Link>
                    </Button>
                )}
                <Button variant={canRejoin ? "outline" : "default"} asChild>
                    <Link to="/">Home</Link>
                </Button>
            </div>
        </div>
    );
}
