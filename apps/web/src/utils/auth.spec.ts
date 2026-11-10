import { describe, expect, test } from "bun:test";

import { Account, NO_AUTH, Seat, StoredAuth, expiryOf, readAuth, replaceTokens, sessionFor, writeAuth } from "./auth";

const NOW = Date.UTC(2026, 10, 10);

/** A token that runs out at `exp`, in seconds, as a JWT's payload says it. */
function tokenUntil(exp: number): string {
    return `header.${btoa(JSON.stringify({ exp })).replace(/=+$/, "")}.signature`;
}

/** A refresh token that has a week left. */
const LIVE = tokenUntil(NOW / 1000 + 7 * 24 * 60 * 60);
const EXPIRED = tokenUntil(NOW / 1000 - 60);

const account: Account = {
    token: "account-token",
    refreshToken: LIVE,
    user: { kind: "registered", id: "user-id", name: "alex", email: "alex@example.com" },
};

function seat(name: string, refreshToken: string = LIVE): Seat {
    return { token: `${name}-token`, refreshToken, user: { kind: "anonymous", name } };
}

/** A browser's storage, as a map, for the tests. */
function storage(entries: Record<string, string> = {}) {
    const items = new Map(Object.entries(entries));
    return {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => void items.set(key, value),
    };
}

describe("readAuth", () => {
    test("reads nothing from empty storage", () => {
        expect(readAuth(storage(), NOW)).toEqual(NO_AUTH);
    });

    test("reads what writeAuth kept", () => {
        const auth: StoredAuth = { account, seats: { "111111": seat("sam"), "222222": seat("tom") } };
        const kept = storage();
        writeAuth(kept, auth);

        expect(readAuth(kept, NOW)).toEqual(auth);
    });

    test("reads a spectator's seat, which has no name", () => {
        const spectator: Seat = { token: "watcher-token", refreshToken: LIVE, user: { kind: "spectator" } };
        const kept = storage();
        writeAuth(kept, { account: null, seats: { "111111": spectator } });

        expect(readAuth(kept, NOW).seats["111111"]).toEqual(spectator);
    });

    test("drops what isn't valid", () => {
        expect(readAuth(storage({ auth: "{not json" }), NOW)).toEqual(NO_AUTH);
        expect(readAuth(storage({ auth: JSON.stringify({ account: { token: 1 } }) }), NOW)).toEqual(NO_AUTH);
    });

    test("drops the seats whose refresh token has run out", () => {
        const kept = storage();
        writeAuth(kept, { account: null, seats: { "111111": seat("sam"), "222222": seat("tom", EXPIRED) } });

        expect(Object.keys(readAuth(kept, NOW).seats)).toEqual(["111111"]);
    });
});

describe("sessionFor", () => {
    const auth: StoredAuth = { account, seats: { "111111": seat("sam") } };

    test("is the seat in a lobby that the person joined without an account", () => {
        expect(sessionFor(auth, "111111")).toEqual(seat("sam"));
    });

    test("is the account in any other lobby, and without one", () => {
        expect(sessionFor(auth, "222222")).toEqual(account);
        expect(sessionFor(auth)).toEqual(account);
    });

    test("is nothing without an account or a seat", () => {
        expect(sessionFor({ account: null, seats: { "111111": seat("sam") } }, "222222")).toBeNull();
    });
});

describe("replaceTokens", () => {
    test("replaces only the session whose refresh token was sent", () => {
        const auth: StoredAuth = { account, seats: { "111111": seat("sam", "sam-refresh"), "222222": seat("tom") } };
        const refreshed = replaceTokens(auth, {
            previous: "sam-refresh",
            tokens: { token: "new", refreshToken: "new-refresh" },
        });

        expect(refreshed.seats["111111"]).toEqual({ ...seat("sam"), token: "new", refreshToken: "new-refresh" });
        expect(refreshed.seats["222222"]).toEqual(seat("tom"));
        expect(refreshed.account).toEqual(account);
    });
});

describe("expiryOf", () => {
    test("reads a JWT's expiry, and nothing from a token that isn't one", () => {
        expect(expiryOf(tokenUntil(100))).toBe(100_000);
        expect(expiryOf("not-a-jwt")).toBeUndefined();
        expect(expiryOf("a.%%%.c")).toBeUndefined();
    });
});
