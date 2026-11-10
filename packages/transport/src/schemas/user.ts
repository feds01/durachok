import { z } from "zod";

/**
 * A Username, must follow the rules:
 *
 * - 1..=39 characters long
 * - alphanumeric with dashes.
 * - first character cannot be a dash.
 */
export const UserNameSchema = z
    .string()
    .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, "User name must be alphanumeric and can contain hyphens.");

export type UserName = z.infer<typeof UserNameSchema>;

/** A User's email */
export const UserEmailSchema = z.string().email().trim();
export type UserEmail = z.infer<typeof UserEmailSchema>;

/** A User's password */
export const UserPasswordSchema = z.string().min(8);
export type UserPassword = z.infer<typeof UserPasswordSchema>;

/** A User */
export const UserSchema = z.object({
    /** Associated user id, only exists after user is created. */
    id: z.string(),
    /** User name. */
    name: UserNameSchema,
    /** User email. */
    email: UserEmailSchema,
    /** URL to user's profile picture */
    image: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * What a registered player has done in the games that they played to the end, counted from
 * when the server began to keep score.
 */
export const UserStatisticsSchema = z.object({
    /** The games that they played to the end. */
    gamesPlayed: z.number().int(),
    /** The games that they won, by going out first. */
    gamesWon: z.number().int(),
    /** The games that they lost, as the durak, who is left holding cards. */
    gamesLost: z.number().int(),
});

export type UserStatistics = z.infer<typeof UserStatisticsSchema>;

/**
 * A player that is currently within a lobby, the `id` of the player
 * is referring to their connection id.
 */
export const PlayerSchema = UserSchema.omit({ email: true }).extend({
    /** Whether the player is a bot, from the server's registry of bots. */
    bot: z.boolean().optional(),
});

export type Player = z.infer<typeof PlayerSchema>;
