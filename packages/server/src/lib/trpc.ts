import { TRPCError, initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";

import { AuthService } from "../controllers/auth";
import { CommonService } from "../controllers/common";
import { ImageService } from "../controllers/image";
import { LobbyService } from "../controllers/lobby";
import { UserService } from "../controllers/user";
import { expr } from "../utils";
import { getTokenFromHeaders } from "./authentication";
import logger from "./logger";

/** Function to construct the context that we need */
export const createContext = async ({
    req,
    res,
}: trpcExpress.CreateExpressContextOptions) => {
    const authService = new AuthService();
    const commonService = new CommonService();
    const lobbyService = new LobbyService(logger, commonService);
    const imageService = new ImageService(logger);
    const userService = new UserService(
        logger,
        commonService,
        authService,
        imageService,
        lobbyService,
    );

    const serviceMap = {
        logger,
        authService,
        lobbyService,
        imageService,
        userService,
    };

    // Try and read the user.
    const tokens = await getTokenFromHeaders(authService, req, res);
    if (!tokens) {
        return { ...serviceMap, token: undefined, rawTokens: undefined };
    }

    return {
        ...serviceMap,
        token: tokens.payload,
        rawTokens: {
            token: tokens.token,
            refreshToken: tokens.refreshToken,
        },
    };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;

/** A procedure than any one can access. */
export const publicProcedure = t.procedure;

export const authProcedure = t.procedure.use(async function hasToken(opts) {
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
 */
export const userProcedure = t.procedure.use(async function isAuthed(opts) {
    const { ctx } = opts;

    const token = ctx.token;
    if (!token || token.kind !== "registered") {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Try and get user from the token.
    const user = await expr(async () => {
        try {
            return await ctx.userService.get(token.user.id);
        } catch (e: unknown) {
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
