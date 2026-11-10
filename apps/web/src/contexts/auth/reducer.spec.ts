import { describe, expect, test } from "bun:test";

import { Account, NO_AUTH, Seat } from "../../utils/auth";

import { AuthState, reduceAuth } from "./reducer";

const account: Account = {
    token: "account-token",
    refreshToken: "account-refresh",
    user: { kind: "registered", id: "user-id", name: "alex", email: "alex@example.com" },
};

function seat(name: string): Seat {
    return { token: `${name}-token`, refreshToken: `${name}-refresh`, user: { kind: "anonymous", name } };
}

describe("reduceAuth", () => {
    test("joining a second lobby keeps the seat in the first", () => {
        const first = reduceAuth(NO_AUTH, { type: "join", pin: "111111", payload: seat("sam") });
        const second = reduceAuth(first, { type: "join", pin: "222222", payload: seat("tom") });

        expect(second.seats).toEqual({ "111111": seat("sam"), "222222": seat("tom") });
    });

    test("leaving a lobby gives up only its seat", () => {
        const state: AuthState = { account, seats: { "111111": seat("sam"), "222222": seat("tom") } };

        expect(reduceAuth(state, { type: "leave", pin: "111111" })).toEqual({
            account,
            seats: { "222222": seat("tom") },
        });
    });

    test("logging in to an account keeps the seats, and so does logging out of it", () => {
        const seated: AuthState = { account: null, seats: { "111111": seat("sam") } };
        const loggedIn = reduceAuth(seated, { type: "login", payload: account });

        expect(loggedIn).toEqual({ account, seats: seated.seats });
        expect(reduceAuth(loggedIn, { type: "logout" })).toEqual(seated);
    });

    test("updating the user changes the account's user", () => {
        const state: AuthState = { account, seats: {} };
        const updated = reduceAuth(state, {
            type: "update",
            payload: { id: "user-id", name: "sasha", email: "s@example.com" },
        });

        expect(updated.account?.user).toEqual({
            kind: "registered",
            id: "user-id",
            name: "sasha",
            email: "s@example.com",
        });
        expect(reduceAuth(NO_AUTH, { type: "update", payload: account.user })).toBe(NO_AUTH);
    });

    test("refreshed tokens replace the session that sent them", () => {
        const state: AuthState = { account, seats: { "111111": seat("sam") } };
        const tokens = { token: "new", refreshToken: "new-refresh" };

        expect(
            reduceAuth(state, { type: "tokens", payload: { previous: "sam-refresh", tokens } }).seats["111111"],
        ).toEqual({
            ...seat("sam"),
            ...tokens,
        });
    });
});
