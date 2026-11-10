import { describe, expect, test } from "bun:test";

import { PlayerGameState } from "@durachok/transport";

import { announcedRole, announcementFor, RoundView, roundViewOf } from "./announcement";

const game: PlayerGameState = {
    player: { name: "me", deck: ["6S", "7S"], out: null, turned: false, beganRound: true, action: "attack" },
    players: [
        {
            name: "other",
            deck: { type: "hidden", size: 6 },
            out: null,
            turned: false,
            beganRound: false,
            action: "defend",
        },
        {
            name: "third",
            deck: { type: "hidden", size: 6 },
            out: null,
            turned: false,
            beganRound: false,
            action: "none",
        },
    ],
    tableTop: {},
    deckSize: 24,
    discardSize: 0,
    trump: { suit: "H", card: "AH" },
};

const withPlayer = (player: Partial<PlayerGameState["player"]>, tableTop: PlayerGameState["tableTop"] = {}) => ({
    ...game,
    player: { ...game.player, ...player },
    tableTop,
});

/** A round of three, from the view of `me`: who opens the attack, and who defends. */
const round = (attacker: string, defender: string, tableTop: PlayerGameState["tableTop"] = {}): RoundView => {
    const roleOf = (name: string) => {
        if (name === defender) {
            return "defend";
        }
        return name === attacker ? "attack" : "none";
    };
    return roundViewOf({
        ...game,
        player: { ...game.player, action: roleOf("me"), beganRound: attacker === "me" },
        players: game.players.map((other) => ({
            ...other,
            action: roleOf(other.name),
            beganRound: attacker === other.name,
        })),
        tableTop,
    });
};

describe("announcedRole", () => {
    test("tells the player who opens the attack, and the defender, but not who joins in later", () => {
        expect(announcedRole(game)).toBe("attack");
        expect(announcedRole(withPlayer({ action: "defend", beganRound: false }))).toBe("defend");
        expect(announcedRole(withPlayer({ beganRound: false }))).toBeNull();
        expect(announcedRole(withPlayer({ action: "none", beganRound: false }))).toBeNull();
        expect(announcedRole(withPlayer({ out: 1 }))).toBeNull();
    });
});

describe("announcementFor", () => {
    const attacking = roundViewOf(game);
    const attackPlayed = roundViewOf(withPlayer({}, { "6S": null }));

    test("announces the role that the game starts with, and who is on the other side", () => {
        expect(announcementFor(null, attacking)).toEqual({
            kind: "role",
            role: "attack",
            opponent: "other",
            passedBy: null,
        });
        expect(announcementFor(null, roundViewOf(withPlayer({ action: "none", beganRound: false })))).toBeNull();
    });

    test("stays quiet while the round goes on", () => {
        expect(announcementFor(attacking, attackPlayed)).toBeNull();
        expect(announcementFor(attackPlayed, roundViewOf(withPlayer({}, { "6S": "7S" })))).toBeNull();
    });

    test("announces the same role again as the table clears for the next round", () => {
        expect(announcementFor(attackPlayed, attacking)).toMatchObject({ kind: "role", role: "attack" });
    });

    test("stays quiet when the player loses their role", () => {
        expect(announcementFor(attackPlayed, roundViewOf(withPlayer({ out: 1 }, { "6S": null })))).toBeNull();
    });

    test("tells the player that the attack was passed on to them", () => {
        const before = round("third", "other", { "6S": null });
        const after = round("other", "me", { "6S": null, "6H": null });
        expect(announcementFor(before, after)).toEqual({
            kind: "role",
            role: "defend",
            opponent: "other",
            passedBy: "other",
        });
    });

    test("tells everybody else that the attack was passed on, and to whom", () => {
        const before = round("me", "other", { "6S": null });
        const after = round("other", "third", { "6S": null, "6H": null });
        expect(announcementFor(before, after)).toEqual({ kind: "passed", from: "other", to: "third", byMe: false });
    });

    test("tells the player who passed the attack on who defends now", () => {
        const before = round("third", "me", { "6S": null });
        const after = round("me", "other", { "6S": null, "6H": null });
        expect(announcementFor(before, after)).toEqual({ kind: "passed", from: "me", to: "other", byMe: true });
    });

    test("doesn't take a new round's defender for a pass", () => {
        const before = round("me", "other", { "6S": "7S" });
        const after = round("other", "third");
        expect(announcementFor(before, after)).toBeNull();
    });
});
