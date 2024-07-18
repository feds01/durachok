import { z } from "zod";

/**
 * Username schema.
 *
 * Rules:
 *
 * - Must be alphanumeric.
 * - Can contain hyphens.
 * - Must be between 1 and 39 characters long.
 *
 */
export const UserNameSchema = z
    .string()
    .regex(
        /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
        "User name must be alphanumeric and can contain hyphens.",
    );

/** A Username  */
export type UserName = z.infer<typeof UserNameSchema>;

export const UserRegistrationSchema = z.object({
    email: z.string().email(),
    username: UserNameSchema,
    password: z.string().min(8),
});

export type UserRegistration = z.infer<typeof UserRegistrationSchema>;
