import { z } from "zod";

import { UserSchema } from "./user";

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
