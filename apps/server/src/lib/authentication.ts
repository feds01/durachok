import type * as express from "express";

import { AuthService } from "../controllers/auth";
import { UserTokensResponse, UserTokensResponseSchema } from "../schemas/auth";
import { assert, expr, isDef } from "../utils";

type Headers = { [key: string]: string | string[] | undefined };

/**
 * This function will attempt to extract the token from the request headers. If the token
 * is not present, it will return null. If the token is present, it will attempt to verify
 * the token. If the token is invalid, it will attempt to refresh the token using the
 * refresh token. If the refresh token is invalid, it will return null.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @returns - The token payload if the token is valid, otherwise null.
 */
export async function getTokenFromHeaders(
    authService: AuthService,
    headers: Headers,
    onNewTokens?: (tokens: UserTokensResponse) => void,
): Promise<UserTokensResponse | null> {
    const token = headers["x-token"];
    const refreshToken = expr(() => {
        const raw = headers["x-refresh-token"];
        if (!isDef(raw) || typeof raw !== "string") {
            return null;
        }

        return raw;
    });

    const verifiedToken = await authService.verifyToken(token);

    // Fast path, we have a valid token.
    if (verifiedToken) {
        assert(isDef(token) && typeof token === "string");
        return { payload: verifiedToken, token, refreshToken };
    }

    // Since we don't have a refresh token, we can't try to
    // refresh the token.
    if (!refreshToken) {
        return null;
    }

    const newTokens = await authService.refreshTokens(refreshToken);

    // Send back new tokens if they were generated.
    if (isDef(newTokens) && onNewTokens) {
        onNewTokens(newTokens);
        return newTokens;
    }

    // We failed to refresh the token, so we return null.
    return null;
}

/**
 * Set the tokens in the response headers.
 *
 * @param res - The response object.
 * @param tokens - The tokens to set.
 */
export function setTokensInResponse(
    res: express.Response,
    tokens: UserTokensResponse,
): void {
    res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
    res.set("x-token", tokens.token);
    res.set("x-refresh-token", tokens.refreshToken ?? "");
}

/**
 * Ensure that the payload is a valid token payload.
 *
 * @param payload - The payload to check.
 * @returns - The payload if it is valid, otherwise null.
 */
export function ensurePayloadIsTokens(
    payload: unknown,
): UserTokensResponse | null {
    const parsed = UserTokensResponseSchema.safeParse(payload);

    if (parsed.success) {
        return parsed.data;
    }

    return null;
}
