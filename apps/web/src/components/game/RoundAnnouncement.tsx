import { AnimatePresence, motion } from "framer-motion";
import { Forward, LucideIcon, Shield, Swords } from "lucide-react";
import { useState } from "react";

import { AnnouncementContent, announcementFor, RoundView, roundViewOf, sameRoundView } from "@/lib/announcement";
import { cn } from "@/lib/utils";
import { PlayerGameState } from "@durachok/transport";

export type Announcement = AnnouncementContent & {
    /** Which announcement this is, so that the same one, a round later, shows again. */
    id: number;
};

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

/** What the table tells the player as the round goes on: their role, and when the attack is passed on. */
export function useRoundAnnouncement(game: PlayerGameState): [Announcement | null, () => void] {
    const view = roundViewOf(game);
    const [seen, setSeen] = useState<RoundView | null>(null);
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);

    if (seen === null || !sameRoundView(seen, view)) {
        setSeen(view);
        const content = announcementFor(seen, view);
        if (content) {
            setAnnouncement({ ...content, id: (announcement?.id ?? 0) + 1 });
        }
    }

    return [announcement, () => setAnnouncement(null)];
}

type Props = {
    announcement: Announcement | null;
    /** Called once the announcement has faded away. */
    onDone: () => void;
};

/** What the round tells the player, across the middle of the table for a moment. */
export default function RoundAnnouncement({ announcement, onDone }: Props) {
    const shown = announcement && shownAs(announcement);

    return (
        <div aria-live="polite" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <AnimatePresence>
                {announcement && shown && (
                    <motion.div
                        key={announcement.id}
                        className="flex flex-col items-center gap-1 rounded-2xl bg-background/75 px-6 py-4 text-center shadow-xl backdrop-blur-sm"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 1.04] }}
                        transition={{ duration: SECONDS, times: [0, 0.15, 0.8, 1], ease: "easeOut" }}
                        onAnimationComplete={onDone}
                    >
                        <p className={cn("m-0 flex items-center gap-3 text-3xl font-bold sm:text-5xl", shown.tone)}>
                            <shown.icon className="size-8 shrink-0 sm:size-12" aria-hidden="true" />
                            {shown.title}
                        </p>
                        {shown.detail && <p className="m-0 text-muted-foreground sm:text-lg">{shown.detail}</p>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
