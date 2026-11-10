import { UserAuthResponseSchema, UserLoginSchema, UserRegistrationSchema } from "@durachok/transport";
import { TRPCError } from "@trpc/server";
import { Logger } from "pino";

import { ENV, RE_CAPTCHA_SECRET } from "../../config";
import { limits } from "../../lib/limits";
import { verifyReCaptcha } from "../../lib/recaptcha";
import { authProcedure, failureLimitedProcedure, limitedProcedure, router } from "../trpc";
import { UserTokensResponseSchema } from "../../schemas/auth";
import { isDef } from "../../utils";

/**
 * Check that whoever registers solved the reCAPTCHA, @see RE_CAPTCHA_SECRET. Without the key,
 * development lets anyone register, and production nobody, as it can't tell people from bots.
 */
async function ensureSolvedReCaptcha(logger: Logger, token: string, ip: string): Promise<void> {
    const configured = RE_CAPTCHA_SECRET !== "";
    if (!configured && ENV !== "production") {
        return;
    }
    if (!configured) {
        logger.error("RE_CAPTCHA_KEY isn't set, so nobody can register");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Registering isn't possible right now." });
    }

    const { passed, errors } = await verifyReCaptcha(RE_CAPTCHA_SECRET, token, ip);
    if (!passed) {
        logger.info({ errors }, "a reCAPTCHA didn't pass");
        throw new TRPCError({ code: "BAD_REQUEST", message: "The reCAPTCHA didn't pass, so try it again." });
    }
}

export const authRouter = router({
    // Each address makes only so many accounts, and fails to log in only so often, @see limits.
    register: limitedProcedure(limits.registrations)
        .input(UserRegistrationSchema)
        .output(UserAuthResponseSchema)
        .mutation(async (req) => {
            const { ctx, input } = req;

            await ensureSolvedReCaptcha(ctx.logger, input.reCaptchaToken, ctx.ip);

            const user = await ctx.userService.create(input);

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                ...(await ctx.authService.createTokens({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                })),
            };
        }),

    login: failureLimitedProcedure(limits.failedLogins)
        .input(UserLoginSchema)
        .output(UserAuthResponseSchema)
        .mutation(async (req) => {
            const { ctx, input } = req;

            const credentials = await ctx.userService.getCredentials(input);
            if (!credentials) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid credentials",
                });
            }

            // Now check with auth service to see if the credentials are valid.
            const valid = await ctx.authService.verify(credentials.password, input.password);
            if (!valid) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid credentials",
                });
            }

            return {
                id: credentials.id,
                name: credentials.name,
                email: credentials.email,
                ...(isDef(credentials.image) && { image: credentials.image }),
                ...(await ctx.authService.createTokens({
                    id: credentials.id,
                    name: credentials.name,
                    email: credentials.email,
                })),
            };
        }),

    refresh: authProcedure.output(UserTokensResponseSchema).mutation(async (req) => {
        const { ctx } = req;

        if (!req.ctx.rawTokens.refreshToken) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "No refresh token provided",
            });
        }

        const tokens = await ctx.authService.refreshTokens(req.ctx.rawTokens.refreshToken);

        if (!tokens) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid refresh token",
            });
        }

        return tokens;
    }),
});
