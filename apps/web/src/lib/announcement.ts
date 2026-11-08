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
    return (
        a.me === b.me &&
        a.role === b.role &&
        a.tableSize === b.tableSize &&
        a.attacker === b.attacker &&
        a.defender === b.defender
    );
}

/**
 * What the player is told as the round goes from one view to the next. Everybody is told when
 * the defender passes the attack on. Otherwise, the player is told their role as the game
 * starts, as the table clears for the next round, and when their role changes.
 */
export function announcementFor(before: RoundView | null, after: RoundView): AnnouncementContent | null {
    // Passing the attack on adds a card to the table, which another player now defends.
    const passedFrom =
        before?.defender &&
        after.defender &&
        before.defender !== after.defender &&
        before.tableSize > 0 &&
        after.tableSize > before.tableSize
            ? before.defender
            : null;

    if (passedFrom && after.defender) {
        return after.defender === after.me
            ? { kind: "role", role: "defend", opponent: after.attacker, passedBy: passedFrom }
            : { kind: "passed", from: passedFrom, to: after.defender, byMe: passedFrom === after.me };
    }

    if (after.role === null) {
        return null;
    }
    const newRound = before === null || (before.tableSize > 0 && after.tableSize === 0);
    if (!newRound && before?.role === after.role) {
        return null;
    }

    return {
        kind: "role",
        role: after.role,
        opponent: after.role === "attack" ? after.defender : after.attacker,
        passedBy: null,
    };
}
