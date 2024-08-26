import { UserSchema } from "@durachok/transport/src/schemas/user";
import { z } from "zod";

export const RawTokenPayload = z.object({
    data: z
        .object({
            name: z.string(),
            email: z.string(),
            id: z.string(),
        })
        .or(
            z.object({
                name: z.string(),
                pin: z.string(),
            }),
        ),
    iat: z.number(),
    exp: z.number(),
    iss: z.string().optional(),
});

export type RawTokenPayload = z.infer<typeof RawTokenPayload>;

const TokenPayloadSchema = z.union([
    z.object({
        kind: z.literal("registered"),
        user: UserSchema,
    }),
    z.object({
        kind: z.literal("anonymous"),
        name: z.string(),
        pin: z.string(),
    }),
]);

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

/** The response that we send when we refresh the user's tokens. */
export const UserTokensResponseSchema = z
    .object({
        /** The user's access token */
        token: z.string(),
        /** The user's refresh token */
        refreshToken: z.string().nullable(),
        /** The user payload. */
        payload: TokenPayloadSchema,
    })
    .strict();

export type UserTokensResponse = z.infer<typeof UserTokensResponseSchema>;
