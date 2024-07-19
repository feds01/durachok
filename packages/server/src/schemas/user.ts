import { ObjectId } from "mongodb";
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
    .regex(
        /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
        "User name must be alphanumeric and can contain hyphens.",
    );

export type UserName = z.infer<typeof UserNameSchema>;

/** A User's email */
export const UserEmailSchema = z.string().email().trim();

export type UserEmail = z.infer<typeof UserEmailSchema>;

/** A raw DB user object */
export const DBUserSchema = z
    .object({
        /** Associated user id, only exists after user is created. */
        _id: z.instanceof(ObjectId),
        /** User name. */
        name: UserNameSchema,
        /** User email. */
        email: z.string().email(),
        /** Optionally encoded base64 user profile image. */
        image: z.boolean(),
    })
    .transform((data) => {
        return {
            id: data._id.toString(),
            name: data.name,
            email: data.email,
            image: data.image,
        };
    });

export type DBUser = z.infer<typeof DBUserSchema>;

/** A User */
export const UserSchema = z.object({
    /** Associated user id, only exists after user is created. */
    id: z.string(),
    /** User name. */
    name: UserNameSchema,
    /** User email. */
    email: z.string().email(),
    /** Optionally encoded base64 user profile image. */
    image: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const UserRegistrationSchema = UserSchema.omit({ id: true }).extend({
    /** The user's password */
    password: z.string().min(8),

    /** A token to register with */
    reCaptchaToken: z.string(),
});

export type UserRegistration = z.infer<typeof UserRegistrationSchema>;

/** The name can either be an email or a username */
export const UserLoginSchema = z
    .object({
        /** The user's username */
        name: UserNameSchema.optional(),
        /** The user's email */
        email: UserEmailSchema.optional(),
        /** The user's password */
        password: z.string().min(8),
    })
    .refine((data) => {
        return data.name || data.email;
    });

export type UserLogin = z.infer<typeof UserLoginSchema>;

/** Updating a user's account, this allows us to update the username, email, and add an image. */
export const UserUpdateSchema = UserSchema.partial().extend({
    image: z.string().optional(),
});

export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const UserStatisticsSchema = z.object({
    gamesPlayed: z.number().int(),
    gamesHosted: z.number().int(),
    gamesResigned: z.number().int(),
    gamesWon: z.number().int(),
    gamesLost: z.number().int(),
    averageRounds: z.number().int(),
});

export type UserStatistics = z.infer<typeof UserStatisticsSchema>;

/**
 * A simplified Lobby object containing only information
 * that is necessary for the client to know. I.E. This can
 * be used to indicate to the client what conditions the
 * lobby is in.
 * */
export const SimplifiedLobbySchema = z.object({
    pin: z.string(),
    joinable: z.boolean(),
    passphrase: z.boolean(),
});

export type SimplifiedLobby = z.infer<typeof SimplifiedLobbySchema>;

export const UserInfoSchema = UserSchema.extend({
    /** Player statistics that are accumulated over time. */
    statistics: UserStatisticsSchema.optional(),
    /** The list of currently active games that the user is in. */
    games: z.array(SimplifiedLobbySchema),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;
