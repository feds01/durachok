import { Buffer } from "buffer";
import { z } from "zod";

import {
  UserEmailSchema,
  UserNameSchema,
  UserSchema,
  UserStatisticsSchema,
} from "../schemas/user";
import { LobbyInfoSchema } from "./lobby";

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

/** Updating a user's account, this allows us to update the username, email, and add an image. */
export const UserUpdateSchema = UserSchema.partial().extend({
  image: z.instanceof(Buffer).optional(),
});

export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const UserInfoSchema = UserSchema.extend({
  /** Player statistics that are accumulated over time. */
  statistics: UserStatisticsSchema.optional(),
  /** The list of currently active games that the user is in. */
  games: z.array(LobbyInfoSchema),
}).strict();

export type UserInfo = z.infer<typeof UserInfoSchema>;
