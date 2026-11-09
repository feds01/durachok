import { transformer } from "@durachok/transport";
import { TRPCError, initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { ZodError } from "zod";

import { expr } from "../utils";
import { RateLimiter } from "../lib/rate-limit";
import { transformZodErrorIntoErrorSummary } from "../utils/error";
import { getTokenFromHeaders, setTokensInResponse } from "./authentication";
import { createContext } from "./context";
import logger from "../lib/logger";

/** Function to construct the context that we need */
export const createSessionContext = async ({ req, res }: trpcExpress.CreateExpressContextOptions) => {
    const hostname = `${req.protocol}://${req.get("host")}`;
    // The client's address, as the proxies that the server trusts tell it, @see TRUST_PROXY.
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const ctx = { ...createContext(logger, hostname), ip };

    // Try and read the user.
    const tokens = await getTokenFromHeaders(ctx.authService, req.headers, (refreshed) =>
        setTokensInResponse(res, refreshed),
    );
    if (!tokens) {
        return { ...ctx, token: undefined, rawTokens: undefined };
    }

    return {
        ...ctx,
        token: tokens.payload,
        rawTokens: tokens.rawTokens,
    };
};

export type AuthenticatedContext = Awaited<ReturnType<typeof createSessionContext>>;

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<AuthenticatedContext>().create({
    transformer,
    errorFormatter: ({ error, shape }) => {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError:
                    error.code === "BAD_REQUEST" && error.cause instanceof ZodError
                        ? transformZodErrorIntoErrorSummary(error.cause)
                        : null,
            },
        };
    },
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;

/**
 * A procedure than any one can access.
 *
 * - Logs the request timing.
 * - Logs if the request was successful or not.
 */
export const publicProcedure = t.procedure.use(async (opts) => {
    const start = Date.now();

    const result = await opts.next();

    const durationMs = Date.now() - start;
    const meta = { path: opts.path, type: opts.type, durationMs };

    void (result.ok ? logger.info(meta, "OK request timing:") : logger.error(meta, "Non-OK request timing"));

    return result;
});

/** The error for a client that did more than a limit lets it, @see limits. */
export function tooManyRequests(): TRPCError {
    return new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests, wait a minute and try again" });
}

/** A public procedure that each address may call only as often as a limiter lets it. */
export function limitedProcedure(limiter: RateLimiter) {
    return publicProcedure.use((opts) => {
        if (!limiter.take(opts.ctx.ip)) {
            throw tooManyRequests();
        }
        return opts.next();
    });
}

/**
 * A public procedure that each address may fail at only as often as a limiter lets it, such as
 * logging in, so that guessing is slow, but a client that gets it right isn't held back.
 */
export function failureLimitedProcedure(limiter: RateLimiter) {
    return publicProcedure.use(async (opts) => {
        if (limiter.isLimited(opts.ctx.ip)) {
            throw tooManyRequests();
        }

        const result = await opts.next();
        if (!result.ok) {
            limiter.hit(opts.ctx.ip);
        }
        return result;
    });
}

/** A procedure that requires the request to send tokens. */
export const authProcedure = publicProcedure.use(function hasToken(opts) {
    const { ctx } = opts;

    if (!ctx.token || !ctx.rawTokens) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return opts.next({
        ctx: {
            rawTokens: ctx.rawTokens,
            token: ctx.token,
        },
    });
});

/**
 * A procedure that ensure that a `user` must be accessing
 * this procedure. This will check that the user has provided
 * a valid token, and that the user is logged in.
 *
 * - Ensure that the user is logged in, and a user that is "registered".
 */
export const userProcedure = publicProcedure.use(async function isAuthed(opts) {
    const { ctx } = opts;

    const token = ctx.token;
    if (!token || token.kind !== "registered") {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Try and get user from the token.
    const user = await expr(async () => {
        try {
            return await ctx.userService.get(token.user.id);
        } catch {
            ctx.logger.warn("user not found");
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }
    });

    return opts.next({
        ctx: {
            token,
            user,
        },
    });
});
