import { useState } from "react";

import { PlayerGameState } from "@durachok/transport";

/** A role that a round gives the player: they open the attack, or they defend against it. */
export type AnnouncedRole = "attack" | "defend";

/** What the table tells the player for a moment, across the middle. */
export type AnnouncementContent =
    /** The round gives the player a role, the other side of which another player has. */
    | { kind: "role"; role: AnnouncedRole; opponent: string | null; passedBy: string | null }
    /** The defender passed the attack on to the next player, which the player didn't get. */
    | { kind: "passed"; from: string; to: string; byMe: boolean };

/**
 * The role that the round gives the player, if it's one to announce. Players who join an
 * attack once its opener is done aren't told, as the table shows them that they can.
 */
export function announcedRole({ player }: PlayerGameState): AnnouncedRole | null {
    if (player.out !== null) {
        return null;
    }
    if (player.action === "defend") {
        return "defend";
    }
    return player.action === "attack" && player.beganRound ? "attack" : null;
}

/** Where the round was, the last time the player looked. */
export type RoundView = {
    me: string;
    role: AnnouncedRole | null;
    tableSize: number;
    /** Who opened the attack, and who defends against it. */
    attacker: string | null;
    defender: string | null;
};

export function roundViewOf(game: PlayerGameState): RoundView {
    const everyone = [game.player, ...game.players];
    return {
        me: game.player.name,
        role: announcedRole(game),
        tableSize: Object.keys(game.tableTop).length,
        attacker: everyone.find(({ beganRound }) => beganRound)?.name ?? null,
        defender: everyone.find(({ action }) => action === "defend")?.name ?? null,
    };
}

/** Whether two views of the round differ in anything that an announcement depends on. */
export function sameRoundView(a: RoundView, b: RoundView): boolean {
    return (Object.keys(a) as (keyof RoundView)[]).every((key) => a[key] === b[key]);
}

/**
 * Who passed the attack on to whom between two views of the round, if anyone did: passing it
 * on adds a card to the table, which another player then defends.
 */
function passOf(before: RoundView | null, after: RoundView): { from: string; to: string } | null {
    if (!before?.defender || !after.defender || before.defender === after.defender) {
        return null;
    }
    if (before.tableSize === 0 || after.tableSize <= before.tableSize) {
        return null;
    }
    return { from: before.defender, to: after.defender };
}

/**
 * What the player is told as the round goes from one view to the next. Everybody is told when
 * the defender passes the attack on. Otherwise, the player is told their role as the game
 * starts, as the table clears for the next round, and when their role changes.
 */
export function announcementFor(before: RoundView | null, after: RoundView): AnnouncementContent | null {
    const pass = passOf(before, after);
    if (pass?.to === after.me) {
        return { kind: "role", role: "defend", opponent: after.attacker, passedBy: pass.from };
    }
    if (pass) {
        return { kind: "passed", ...pass, byMe: pass.from === after.me };
    }

    if (after.role === null) {
        return null;
    }
    const newRound = before === null || (before.tableSize > 0 && after.tableSize === 0);
    if (!newRound && before.role === after.role) {
        return null;
    }

    const opponent = after.role === "attack" ? after.defender : after.attacker;
    return { kind: "role", role: after.role, opponent, passedBy: null };
}

export type Announcement = AnnouncementContent & {
    /** Which announcement this is, so that the same one, a round later, shows again. */
    id: number;
};

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
