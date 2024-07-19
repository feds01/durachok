import { TRPCError } from "@trpc/server";

import { ENV } from "../config";
import { authProcedure, publicProcedure, router } from "../lib/trpc";
import { UserLoginSchema, UserRegistrationSchema } from "../schemas/user";

export const authRouter = router({
    register: publicProcedure
        .input(UserRegistrationSchema)
        .mutation(async (req) => {
            const { ctx, input } = req;

            // @@Todo: validate the `reCaptchaToken` in the input.
            if (ENV === "production") {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "reCaptchaToken is required",
                });
            }

            return await ctx.userService.create(input);
        }),

    login: publicProcedure.input(UserLoginSchema).mutation(async (req) => {
        const { ctx, input } = req;

        const credentials = await ctx.userService.getCredentials(input);
        if (!credentials) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid credentials",
            });
        }

        // Now check with auth service to see if the credentials are valid.
        const valid = await ctx.authService.verify(
            credentials.password,
            input.password,
        );
        if (!valid) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid credentials",
            });
        }

        return {
            name: credentials.name,
            email: credentials.email,
            ...(await ctx.authService.createTokens({
                id: credentials.id,
                name: credentials.name,
                email: credentials.email,
            })),
        };
    }),

    refresh: authProcedure.mutation(async (req) => {
        const { ctx } = req;

        if (!req.ctx.rawTokens.refreshToken) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "No refresh token provided",
            });
        }

        return await ctx.authService.refreshTokens(
            req.ctx.rawTokens.refreshToken,
        );
    }),
});
