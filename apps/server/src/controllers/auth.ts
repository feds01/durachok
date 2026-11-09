import { hash, verify } from "argon2";
import jwt from "jsonwebtoken";
import { Logger } from "pino";

import { JWT_REFRESH_SECRET, JWT_SECRET } from "../config";
import { isDocumentId } from "../lib/database";
import BotUsers from "../models/bot.model";
import Users from "../models/user.model";
import { RawTokenPayload, TokenPayload, UserTokensResponse } from "../schemas/auth";
import { expr, isDef } from "../utils";

export type Tokens = {
    /** The basic token. */
    token: string;
    /** The refresh token. */
    refreshToken: string;
};

export class AuthService {
    public constructor(private readonly logger: Logger) {}

    /**
     * Verifies the token payload, if the token is invalid, it will return undefined.
     *
     * @param token - The token to verify.
     * @returns The token payload if the token is valid, otherwise undefined.
     */
    public verifyTokenPayload(rawPayload: string | jwt.JwtPayload | undefined): TokenPayload | undefined {
        if (!isDef(rawPayload)) {
            return undefined;
        }

        const payload = expr(() => {
            try {
                if (typeof rawPayload === "string") {
                    return RawTokenPayload.parse(JSON.parse(rawPayload));
                }

                return RawTokenPayload.parse(rawPayload);
            } catch {
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
        }
        if ("bot" in data) {
            return { kind: "bot", bot: { id: data.bot, name: data.name } };
        }
        return {
            kind: "anonymous",
            name: data.name,
            pin: data.pin,
            seat: data.seat,
        };
    }

    /**
     * Whether the server still lets the holder of a token in. A bot can only come in while it
     * is in the registry, so that the server decides which bots play, and a user while their
     * account is there, so that a deleted account's tokens stop working at once, rather than
     * when they expire.
     */
    public async isAllowed(payload: TokenPayload): Promise<boolean> {
        switch (payload.kind) {
            case "anonymous":
                return true;
            case "bot":
                return isDocumentId(payload.bot.id) && isDef(await BotUsers.exists({ _id: payload.bot.id }));
            case "registered":
                return isDocumentId(payload.user.id) && isDef(await Users.exists({ _id: payload.user.id }));
        }
    }

    /**
     * Create a new password.
     *
     * This will use a hashing algorithm to create a new password.
     */
    public hashPassword(password: string): Promise<string> {
        return hash(password);
    }

    /**
     * Verify a password.
     */
    public verify(hash: string, password: string): Promise<boolean> {
        return verify(hash, password);
    }

    /**
     * Create a new set of tokens.
     */
    public createTokens(payload: RawTokenPayload["data"]): Tokens {
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
    public refreshTokens(refreshToken: string): UserTokensResponse | undefined {
        const decodedToken = this.verifyToken(refreshToken, JWT_REFRESH_SECRET);

        if (!isDef(decodedToken)) {
            return undefined;
        }

        // We need to convert the token into a raw payload.
        const rawPayload = expr(() => {
            if (decodedToken.kind === "anonymous") {
                return {
                    name: decodedToken.name,
                    pin: decodedToken.pin,
                    seat: decodedToken.seat,
                };
            }
            if (decodedToken.kind === "bot") {
                return { name: decodedToken.bot.name, bot: decodedToken.bot.id };
            }
            return {
                name: decodedToken.user.name,
                email: decodedToken.user.email,
                id: decodedToken.user.id,
            };
        });

        const newTokens = this.createTokens(rawPayload);

        return {
            rawTokens: {
                token: newTokens.token,
                refreshToken: newTokens.refreshToken,
            },
            payload: decodedToken,
        };
    }

    verifyToken(token: unknown, secret: string = JWT_SECRET) {
        // @@Todo: perhaps we should throw an error?
        if (typeof token !== "string") {
            return undefined;
        }

        const raw = expr(() => {
            try {
                return jwt.verify(token, secret);
            } catch (e: unknown) {
                this.logger.warn(`Failed to verify token: ${e}`);
                return undefined;
            }
        });

        return this.verifyTokenPayload(raw);
    }
}
