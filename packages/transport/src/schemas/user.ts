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

export const UserRegistrationSchema = UserSchema.omit({
  id: true,
  image: true,
}).extend({
  /** The user's password */
  password: z.string().min(8),
  /** Buffer of user profile picture */
  image: z.instanceof(Buffer).optional(),
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

/** The response that we send when user successfully logs in.  */
export const UserAuthResponseSchema = UserSchema.extend({
  /** The user's id */
  id: z.string(),
  /** The user's user name */
  name: UserNameSchema,
  /** The user's email */
  email: UserEmailSchema,
  /** The user's access token */
  token: z.string(),
  /** The user's refresh token */
  refreshToken: z.string(),
}).strict();