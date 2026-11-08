import { AnimatePresence, motion } from "framer-motion";
import { Forward, LucideIcon, Shield, Swords } from "lucide-react";

import { Announcement, AnnouncementContent } from "@/lib/announcement";
import { cn } from "@/lib/utils";

/** How long an announcement stays up, in seconds. */
const SECONDS = 2.2;

/** The announcement, as the player sees it. */
function shownAs(announcement: AnnouncementContent): {
    icon: LucideIcon;
    title: string;
    detail: string | null;
    tone: string;
} {
    if (announcement.kind === "passed") {
        const { from, to, byMe } = announcement;
        return {
            icon: Forward,
            title: "Passed on",
            detail: byMe ? `${to} is defending now` : `${from} passed the attack to ${to}`,
            tone: "text-violet-300",
        };
    }

    const { role, opponent, passedBy } = announcement;
    if (role === "attack") {
        return {
            icon: Swords,
            title: "You're attacking",
            detail: opponent && `${opponent} is defending`,
            tone: "text-amber-300",
        };
    }
    return {
        icon: Shield,
        title: "You're defending",
        detail: passedBy ? `${passedBy} passed the attack to you` : opponent && `${opponent} is attacking`,
        tone: "text-sky-300",
    };
}

type Props = {
    announcement: Announcement | null;
    /** Whether there are cards on the table, which the announcement keeps clear of, at the table's top edge. */
    overCards: boolean;
    /** Called once the announcement has faded away. */
    onDone: () => void;
};

/** What the round tells the player, across the middle of the table for a moment. */
export default function RoundAnnouncement({ announcement, overCards, onDone }: Props) {
    const shown = announcement && shownAs(announcement);

    return (
        <div
            aria-live="polite"
            className={cn(
                "pointer-events-none absolute inset-0 z-20 flex justify-center",
                overCards ? "items-start" : "items-center",
            )}
        >
            <AnimatePresence>
                {announcement && shown && (
                    <motion.div
                        key={announcement.id}
                        className={cn(
                            "flex flex-col items-center gap-1 rounded-2xl bg-background/85 text-center shadow-xl backdrop-blur-sm",
                            // Over the cards, it sits on the table's top edge, half above it.
                            overCards ? "-mt-7 px-4 py-2" : "px-6 py-4",
                        )}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 1.04] }}
                        transition={{ duration: SECONDS, times: [0, 0.15, 0.8, 1], ease: "easeOut" }}
                        onAnimationComplete={onDone}
                    >
                        <p
                            className={cn(
                                "m-0 flex items-center gap-3 font-bold",
                                overCards ? "text-xl sm:text-3xl" : "text-3xl sm:text-5xl",
                                shown.tone,
                            )}
                        >
                            <shown.icon
                                className={cn("shrink-0", overCards ? "size-6 sm:size-8" : "size-8 sm:size-12")}
                                aria-hidden="true"
                            />
                            {shown.title}
                        </p>
                        {shown.detail && <p className="m-0 text-muted-foreground sm:text-lg">{shown.detail}</p>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
