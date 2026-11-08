import { UserSchema } from "@durachok/transport";
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
                /** The secret of the player's place in the lobby, @see DBPlayer.seat. */
                seat: z.string(),
            }),
        )
        .or(
            z.object({
                name: z.string(),
                /** The ID of the bot in the registry. */
                bot: z.string(),
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
        seat: z.string(),
    }),
    /** A bot from the registry, @see IBotUser. */
    z.object({
        kind: z.literal("bot"),
        bot: z.object({ id: z.string(), name: z.string() }),
    }),
]);

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

/**
 * Who holds a token, the same for each of their tokens and connections, e.g. to count what they
 * do: a user by their account, a bot by the registry, and an anonymous player by their place.
 */
export function holderOf(token: TokenPayload): string {
    switch (token.kind) {
        case "registered":
            return `user:${token.user.id}`;
        case "bot":
            return `bot:${token.bot.id}`;
        case "anonymous":
            return `seat:${token.seat}`;
    }
}

/** The response that we send when we refresh the user's tokens. */
export const UserTokensResponseSchema = z
    .object({
        rawTokens: z.object({
            /** The user's access token */
            token: z.string(),
            /** The user's refresh token */
            refreshToken: z.string().nullable(),
        }),
        /** The user payload. */
        payload: TokenPayloadSchema,
    })
    .strict();

export type UserTokensResponse = z.infer<typeof UserTokensResponseSchema>;
