import type * as express from "express";

import { AuthService } from "../controllers/auth";
import { TokenPayload } from "../schemas/auth";
import { assert, expr, isDef } from "../utils";

type Tokens = {
    payload: TokenPayload;
    /** The basic token. */
    token: string;
    /** The refresh token. */
    refreshToken: string | null;
};

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
    req: express.Request,
    res: express.Response,
): Promise<Tokens | null> {
    const token = req.headers["x-token"];
    const refreshToken = expr(() => {
        const raw = req.headers["x-refresh-token"];
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
    if (isDef(newTokens)) {
        res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
        res.set("x-token", newTokens.token);
        res.set("x-refresh-token", newTokens.refreshToken);
        return newTokens;
    }

    // We failed to refresh the token, so we return null.
    return null;
}
