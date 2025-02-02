import { z } from "zod";

import {
    UserEmailSchema,
    UserNameSchema,
    UserPasswordSchema,
} from "@durachok/transport";

export const UserRegistrationSchema = z.object({
    email: UserEmailSchema,
    name: UserNameSchema,
    password: UserPasswordSchema,
});

export type UserRegistration = z.infer<typeof UserRegistrationSchema>;

/** Update user details.  */
export const UserUpdateSchema = UserRegistrationSchema.partial();
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
