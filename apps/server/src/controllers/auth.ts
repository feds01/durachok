import { hash, verify } from "argon2";
import jwt from "jsonwebtoken";

import { JWT_REFRESH_SECRET, JWT_SECRET } from "../config";
import {
    RawTokenPayload,
    TokenPayload,
    UserTokensResponse,
} from "../schemas/auth";
import { expr, isDef } from "../utils";

type Tokens = {
    /** The basic token. */
    token: string;
    /** The refresh token. */
    refreshToken: string;
};

export class AuthService {
    public constructor() {}

    /**
     * Verifies the token payload, if the token is invalid, it will return undefined.
     *
     * @param token - The token to verify.
     * @returns The token payload if the token is valid, otherwise undefined.
     */
    private verifyTokenPayload(
        rawPayload: string | jwt.JwtPayload | undefined,
    ): TokenPayload | undefined {
        if (!isDef(rawPayload)) {
            return undefined;
        }

        const payload = expr(() => {
            try {
                if (typeof rawPayload === "string") {
                    return RawTokenPayload.parse(JSON.parse(rawPayload));
                }

                return RawTokenPayload.parse(rawPayload);
            } catch (error) {
                return null;
            }
        });

        if (!payload) {
            return undefined;
        }

        const { data } = payload;

        if ("id" in data) {
            return {
                kind: "registered",
                user: {
                    name: data.name,
                    email: data.email,
                    id: data.id,
                },
            };
        } else {
            return {
                kind: "anonymous",
                name: data.name,
                pin: data.pin,
            };
        }
    }

    /**
     * Create a new password.
     *
     * This will use a hashing algorithm to create a new password.
     */
    public async hashPassword(password: string): Promise<string> {
        return hash(password);
    }

    /**
     * Verify a password.
     */
    public async verify(hash: string, password: string): Promise<boolean> {
        return verify(hash, password);
    }

    /**
     * Create a new set of tokens.
     */
    public async createTokens(
        payload: RawTokenPayload["data"],
    ): Promise<Tokens> {
        const token = jwt.sign({ data: payload }, JWT_SECRET, {
            expiresIn: "1h",
        });

        // sign the refresh-token
        const refreshToken = jwt.sign({ data: payload }, JWT_REFRESH_SECRET, {
            expiresIn: "7d",
        });

        return { token, refreshToken };
    }

    /**
     * Refresh the tokens.
     *
     * @param refreshToken - The refresh token to use.
     * @returns The new tokens if the refresh token is valid, otherwise undefined.
     *
     * @@Todo: don't refresh if the user was deleted.
     */
    public async refreshTokens(
        refreshToken: string,
    ): Promise<UserTokensResponse | undefined> {
        const decodedToken = await this.verifyToken(
            refreshToken,
            JWT_REFRESH_SECRET,
        );

        if (!isDef(decodedToken)) {
            return undefined;
        }

        // We need to convert the token into a raw payload.
        const rawPayload = expr(() => {
            if (decodedToken.kind === "anonymous") {
                return {
                    name: decodedToken.name,
                    pin: decodedToken.pin,
                };
            } else {
                return {
                    name: decodedToken.user.name,
                    email: decodedToken.user.email,
                    id: decodedToken.user.id,
                };
            }
        });

        const newTokens = await this.createTokens(rawPayload);

        return {
            token: newTokens.token,
            refreshToken: newTokens.refreshToken,
            payload: decodedToken,
        };
    }

    async verifyToken(token: unknown, secret: string = JWT_SECRET) {
        // @@Todo: perhaps we should throw an error?
        if (typeof token !== "string") {
            return undefined;
        }

        const raw = expr(() => {
            try {
                return jwt.verify(token, secret);
            } catch (e: unknown) {
                return undefined;
            }
        });

        return this.verifyTokenPayload(raw);
    }
}
