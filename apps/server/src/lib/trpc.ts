import { TRPCError, initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import superjson from "superjson";
import { ZodError } from "zod";

import { expr } from "../utils";
import { transformZodErrorIntoErrorSummary } from "../utils/error";
import { getTokenFromHeaders, setTokensInResponse } from "./authentication";
import { createContext } from "./context";
import logger from "./logger";

/** Function to construct the context that we need */
export const createSessionContext = async ({
    req,
    res,
}: trpcExpress.CreateExpressContextOptions) => {
    const hostname = `${req.protocol}://${req.get("host")}`;
    const ctx = createContext(logger, hostname);

    // Try and read the user.
    const tokens = await getTokenFromHeaders(
        ctx.authService,
        req.headers,
        (tokens) => setTokensInResponse(res, tokens),
    );
    if (!tokens) {
        return { ...ctx, token: undefined, rawTokens: undefined };
    }

    return {
        ...ctx,
        token: tokens.payload,
        rawTokens: {
            token: tokens.token,
            refreshToken: tokens.refreshToken,
        },
    };
};

export type AuthenticatedContext = Awaited<
    ReturnType<typeof createSessionContext>
>;

/**
 * Register a hook to convert `Buffer`s to base64
 *
 * @@Todo: maybe move this to `packages/transport`?
 */
superjson.registerCustom<Buffer, string>(
    {
        isApplicable: (value): value is Buffer => Buffer.isBuffer(value),
        serialize: (value) => value.toString("base64"),
        deserialize: (value) => Buffer.from(value, "base64"),
    },
    "buffer",
);

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<AuthenticatedContext>().create({
    transformer: superjson,
    errorFormatter: ({ error, shape }) => {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError:
                    error.code === "BAD_REQUEST" &&
                    error.cause instanceof ZodError
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

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    result.ok
        ? logger.info("OK request timing:", meta)
        : logger.error("Non-OK request timing", meta);

    return result;
});

/** A procedure that requires the request to send tokens. */
export const authProcedure = publicProcedure.use(async function hasToken(opts) {
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
        } catch (_e: unknown) {
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
