import type * as express from "express";

import { AuthService } from "../controllers/auth";
import { UserTokensResponse, UserTokensResponseSchema } from "../schemas/auth";
import { assert, isDef } from "../utils";

type Headers = { [key: string]: string | string[] | undefined };

/**
 * Authenticate a pair of tokens. If the access token is valid, it is used. Otherwise,
 * the refresh token is used to create new tokens, which the caller must hand back to
 * the client. If neither is valid, it returns null.
 *
 * @param authService - The service that verifies and creates tokens.
 * @param token - The access token, if one was sent.
 * @param refreshToken - The refresh token, if one was sent.
 * @returns - The tokens and their payload, and whether they were refreshed, otherwise null.
 */
export async function authenticate(
    authService: AuthService,
    token: unknown,
    refreshToken: unknown,
): Promise<{ tokens: UserTokensResponse; refreshed: boolean } | null> {
    const refresh = typeof refreshToken === "string" && refreshToken !== "" ? refreshToken : null;
    const verifiedToken = await authService.verifyToken(token);

    // Fast path, we have a valid token.
    if (verifiedToken) {
        assert(isDef(token) && typeof token === "string");
        return { tokens: { payload: verifiedToken, rawTokens: { token, refreshToken: refresh } }, refreshed: false };
    }

    // Since we don't have a refresh token, we can't try to
    // refresh the token.
    if (!refresh) {
        return null;
    }

    const newTokens = await authService.refreshTokens(refresh);
    return isDef(newTokens) ? { tokens: newTokens, refreshed: true } : null;
}

/**
 * This function will attempt to extract the token from the request headers, and
 * authenticate it, @see authenticate. New tokens are passed to `onNewTokens`, and
 * without it, an expired token isn't refreshed.
 *
 * @param authService - The service that verifies and creates tokens.
 * @param headers - The request headers.
 * @param onNewTokens - Receives the new tokens, if the expired ones were refreshed.
 * @returns - The token payload if the token is valid, otherwise null.
 */
export async function getTokenFromHeaders(
    authService: AuthService,
    headers: Headers,
    onNewTokens?: (tokens: UserTokensResponse) => void,
): Promise<UserTokensResponse | null> {
    const result = await authenticate(
        authService,
        headers["x-token"],
        onNewTokens ? headers["x-refresh-token"] : undefined,
    );

    if (result?.refreshed) {
        onNewTokens?.(result.tokens);
    }

    return result?.tokens ?? null;
}

/**
 * Set the tokens in the response headers.
 *
 * @param res - The response object.
 * @param tokens - The tokens to set.
 */
export function setTokensInResponse(res: express.Response, tokens: UserTokensResponse): void {
    res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
    res.set("x-token", tokens.rawTokens.token);
    res.set("x-refresh-token", tokens.rawTokens.refreshToken ?? "");
}

/**
 * Ensure that the payload is a valid token payload.
 *
 * @param payload - The payload to check.
 * @returns - The payload if it is valid, otherwise null.
 */
export function ensurePayloadIsTokens(payload: unknown): UserTokensResponse | null {
    const parsed = UserTokensResponseSchema.safeParse(payload);

    if (parsed.success) {
        return parsed.data;
    }

    console.warn(`Invalid token payload, error=\n${parsed.error}`);
    return null;
}
