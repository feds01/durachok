import { InvalidTokenError, jwtDecode } from "jwt-decode";
import { z } from "zod";

import { isDef } from "@durachok/transport";

const AuthTokensSchema = z.object({
    token: z.string(),
    refreshToken: z.string(),
});

/** A user's access token and the refresh token that renews it. */
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

const RegisteredUserSchema = z.object({
    kind: z.literal("registered"),
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().optional(),
});

/** A user with an account. */
export type RegisteredUser = z.infer<typeof RegisteredUserSchema>;

const AnonymousUserSchema = z.object({
    kind: z.literal("anonymous"),
    /** The name that they joined the lobby under. */
    name: z.string().min(1),
});

/** A player without an account, in one lobby. */
export type AnonymousUser = z.infer<typeof AnonymousUserSchema>;

const SpectatorUserSchema = z.object({ kind: z.literal("spectator") });

/** Someone watching one lobby's games, with or without an account, who doesn't play in it. */
export type SpectatorUser = z.infer<typeof SpectatorUserSchema>;

const AccountSchema = AuthTokensSchema.extend({ user: RegisteredUserSchema });

/** The account that the person logged in to, with its tokens. */
export type Account = z.infer<typeof AccountSchema>;

const SeatSchema = AuthTokensSchema.extend({
    user: z.discriminatedUnion("kind", [AnonymousUserSchema, SpectatorUserSchema]),
});

/**
 * A place in one lobby that the person joined without an account, or where they watch its games,
 * with the tokens for it.
 */
export type Seat = z.infer<typeof SeatSchema>;

const StoredAuthSchema = z.object({
    account: AccountSchema.nullable(),
    /** The seats, by the pin of their lobby. */
    seats: z.record(z.string(), SeatSchema),
});

/**
 * Who the person is: their account, if they logged in to one, and their seats in the lobbies
 * that they joined without one, or watch, so that joining one lobby doesn't take them out of another.
 */
export type StoredAuth = z.infer<typeof StoredAuthSchema>;

/** Nobody: no account, and no seats. */
export const NO_AUTH: StoredAuth = { account: null, seats: {} };

/** Where the auth is kept in the browser's storage. */
const STORAGE_KEY = "auth";

/** The auth as the browser keeps it, as JSON, which reading checks against its schema. */
const StoredAuthJson = z.codec(z.string(), StoredAuthSchema, {
    decode: (text, ctx) => {
        try {
            return JSON.parse(text);
        } catch (error: unknown) {
            ctx.issues.push({ code: "invalid_format", format: "json", input: text, message: String(error) });
            return z.NEVER;
        }
    },
    encode: (auth) => JSON.stringify(auth),
});

/** When a token runs out, in milliseconds since the epoch, or nothing for one that can't be read. */
export function expiryOf(token: string): number | undefined {
    try {
        const { exp } = jwtDecode(token);
        return isDef(exp) ? exp * 1000 : undefined;
    } catch (error: unknown) {
        if (error instanceof InvalidTokenError) {
            return undefined;
        }
        throw error;
    }
}

/** The seats whose refresh token hasn't run out, as a seat in a lobby long gone can't renew its tokens. */
function liveSeats(seats: StoredAuth["seats"], now: number): StoredAuth["seats"] {
    return Object.fromEntries(
        Object.entries(seats).filter(([, seat]) => (expiryOf(seat.refreshToken) ?? Infinity) > now),
    );
}

/**
 * Read the auth from the browser's storage. Anything that isn't valid is dropped, as are seats
 * whose refresh token has run out.
 */
export function readAuth(storage: Pick<Storage, "getItem">, now: number = Date.now()): StoredAuth {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) {
        return NO_AUTH;
    }

    const parsed = StoredAuthJson.safeDecode(raw);
    if (!parsed.success) {
        return NO_AUTH;
    }
    return { ...parsed.data, seats: liveSeats(parsed.data.seats, now) };
}

/** Keep the auth in the browser's storage. */
export function writeAuth(storage: Pick<Storage, "setItem">, auth: StoredAuth): void {
    storage.setItem(STORAGE_KEY, StoredAuthJson.encode(auth));
}

/**
 * The session that goes with a lobby: the person's seat in it, if they joined it without an
 * account, and otherwise their account. Without a lobby, it's the account.
 */
export function sessionFor(auth: StoredAuth, pin?: string): Account | Seat | null {
    return (isDef(pin) ? auth.seats[pin] : undefined) ?? auth.account;
}

/** Tokens that the server refreshed, and the refresh token of the session they replace. */
export interface RefreshedTokens {
    previous: string;
    tokens: AuthTokens;
}

/** The auth with the refreshed tokens in place of the session's whose refresh token was sent. */
export function replaceTokens(auth: StoredAuth, { previous, tokens }: RefreshedTokens): StoredAuth {
    const account = auth.account?.refreshToken === previous ? { ...auth.account, ...tokens } : auth.account;
    const seats = Object.fromEntries(
        Object.entries(auth.seats).map(([pin, seat]) => [
            pin,
            seat.refreshToken === previous ? { ...seat, ...tokens } : seat,
        ]),
    );
    return { account, seats };
}

/** The auth in this browser. */
export function loadAuth(): StoredAuth {
    return readAuth(localStorage);
}

/** Keep the auth in this browser. */
export function saveAuth(auth: StoredAuth): void {
    writeAuth(localStorage, auth);
}

/** The tokens to send about a lobby, or without one, the account's, @see sessionFor. */
export function getAuthTokens(pin?: string): Partial<AuthTokens> {
    const session = sessionFor(loadAuth(), pin);
    return session ? { token: session.token, refreshToken: session.refreshToken } : {};
}

/** The headers that authenticate a request about a lobby, or without one, as the account, @see sessionFor. */
export function getAuthHeader(pin?: string): Record<string, string> {
    const { token, refreshToken } = getAuthTokens(pin);

    return {
        ...(isDef(token) && { "x-token": token }),
        ...(isDef(refreshToken) && { "x-refresh-token": refreshToken }),
    };
}

/** The event that announces tokens the server refreshed, @see saveRefreshedTokens. */
const REFRESHED_TOKENS_EVENT = "durachok:refreshed-tokens";

/**
 * Save the tokens that the server refreshed, whether a tRPC response or the socket carried
 * them, in place of the session that sent `previous`, and announce them so that the auth
 * state picks them up.
 */
export function saveRefreshedTokens(previous: string | undefined, tokens: AuthTokens) {
    if (!isDef(previous)) {
        return;
    }

    const refreshed: RefreshedTokens = { previous, tokens };
    saveAuth(replaceTokens(loadAuth(), refreshed));
    window.dispatchEvent(new CustomEvent<RefreshedTokens>(REFRESHED_TOKENS_EVENT, { detail: refreshed }));
}

/**
 * Listen for tokens that the server refreshed.
 *
 * @returns A function that stops listening.
 */
export function onRefreshedTokens(listener: (refreshed: RefreshedTokens) => void): () => void {
    const handler = (event: Event) => listener((event as CustomEvent<RefreshedTokens>).detail);
    window.addEventListener(REFRESHED_TOKENS_EVENT, handler);

    return () => window.removeEventListener(REFRESHED_TOKENS_EVENT, handler);
}
