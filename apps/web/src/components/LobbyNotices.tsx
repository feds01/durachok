import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CardFan } from "@/components/Loader";
import { cn } from "@/lib/utils";

/** How long an error stays up, in seconds, unless the player dismisses it first. */
const ERROR_SECONDS = 6;

const NOTICE =
    "pointer-events-auto relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-xl border bg-card/95 px-4 py-3 shadow-xl backdrop-blur-sm";

const slide = {
    initial: { opacity: 0, y: -16, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.15 } },
};

type Props = {
    /** Whether the connection dropped, and the socket is getting it back. */
    reconnecting: boolean;
    /** The last error that the server reported, and when, so that a repeated one shows again. */
    error: { message: string; at: number } | null;
};

/**
 * What's wrong in the lobby: a lost connection, which holds the page behind the same loader
 * as joining the lobby until it's back, and the server's errors, along the top of the page,
 * which go away on their own.
 */
export default function LobbyNotices({ reconnecting, error }: Props) {
    const [dismissed, setDismissed] = useState<number | null>(null);
    const shown = error && error.at !== dismissed ? error : null;
    const shownAt = shown?.at;

    useEffect(() => {
        if (shownAt === undefined) return;

        const timer = setTimeout(() => setDismissed(shownAt), ERROR_SECONDS * 1000);
        return () => clearTimeout(timer);
    }, [shownAt]);

    return (
        <>
            <AnimatePresence>
                {reconnecting && (
                    // Nothing can be played while the connection is down.
                    <motion.div
                        key="cover"
                        className="fixed inset-0 z-40 bg-background/70 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="flex h-full flex-col items-center justify-center gap-6" aria-live="polite">
                            <CardFan />
                            <div className="flex flex-col items-center gap-1 text-center">
                                <p className="m-0 flex items-center gap-2 text-lg font-semibold">
                                    <WifiOff className="size-5 shrink-0 text-amber-300" aria-hidden="true" />
                                    Connection lost
                                </p>
                                <p className="m-0 text-muted-foreground">Getting you back into the lobby…</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div
                className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
                aria-live="polite"
            >
                <AnimatePresence>
                    {shown && (
                        <motion.div key={shown.at} role="alert" className={cn(NOTICE, "border-rose-400/40")} {...slide}>
                            <TriangleAlert className="size-5 shrink-0 text-rose-400" aria-hidden="true" />
                            <p className="m-0 flex-1 text-sm">{shown.message}</p>
                            <button
                                type="button"
                                onClick={() => setDismissed(shown.at)}
                                aria-label="Dismiss"
                                className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                            {/* The time it stays up, running out along the bottom. */}
                            <motion.span
                                aria-hidden="true"
                                className="absolute bottom-0 left-0 h-0.5 bg-rose-400/70"
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: ERROR_SECONDS, ease: "linear" }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
