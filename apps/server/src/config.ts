import { config } from "dotenv";

import { expr } from "./utils";

config();

/** Database configurations */
export const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/db";

/**
 * The keys that sign tokens, which have no default, since anyone who knew one could forge a token
 * for any account, @see missingSecrets.
 */
export const JWT_SECRET = process.env.JWT_SECRET_KEY ?? "";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET_KEY ?? "";

/**
 * What's wrong with the keys that sign tokens, which the server won't start with: a key that is
 * missing, or one key for both kinds of token, which would let a refresh token, that lasts a week,
 * stand in for an access token.
 */
export function secretProblems(): string[] {
    return [
        ...(!JWT_SECRET ? ["JWT_SECRET_KEY isn't set"] : []),
        ...(!JWT_REFRESH_SECRET ? ["JWT_REFRESH_SECRET_KEY isn't set"] : []),
        ...(JWT_SECRET && JWT_SECRET === JWT_REFRESH_SECRET
            ? ["JWT_SECRET_KEY and JWT_REFRESH_SECRET_KEY must differ"]
            : []),
    ];
}

/** Networking configurations */
export const PORT = process.env.PORT || 8080;
export const ENV = process.env.NODE_ENV || "dev";
export const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

/** How long the countdown before a game starts lasts, in milliseconds. */
export const GAME_COUNTDOWN_MS = Number(process.env.GAME_COUNTDOWN_MS ?? 5000);

/**
 * How many socket events a player may send every five seconds, which is plenty for a person, and
 * which the tests, that play at a machine's pace, raise, @see limits.
 */
export const SOCKET_EVENT_LIMIT = Number(process.env.SOCKET_EVENT_LIMIT ?? 30);

/**
 * Which proxies in front of the server to believe about a client's address, which the rate limits
 * count by, as Express's `trust proxy` takes it. By default, those on this machine, such as the web
 * app's server, which passes on the address that a tunnel says. A number counts the hops instead.
 */
export const TRUST_PROXY: string | number = expr(() => {
    const value = process.env.TRUST_PROXY ?? "loopback";
    return /^\d+$/.test(value) ? Number(value) : value;
});

/** The origins of the web app, which may call the API and connect to the sockets. */
export const WEB_ORIGINS = process.env.WEB_ORIGINS?.split(",") ?? ["http://localhost:5173", "http://localhost:4173"];

/** AWS configurations */
export const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || "";
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
export const AWS_REGION = process.env.AWS_REGION || "";
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";

/** Local folder for uploads. */
export const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER || "uploads";

export const IMAGE_STORAGE = expr(() => {
    if (process.env.IMAGE_STORAGE === "s3") {
        if (!AWS_ACCESS_KEY || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_BUCKET_NAME) {
            return "local";
        }
    }

    return "local";
});
