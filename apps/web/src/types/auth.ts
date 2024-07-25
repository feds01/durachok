import {
    UserEmailSchema,
    UserNameSchema,
    UserPasswordSchema,
} from "@durachok/transport/src/schemas/user";
import { z } from "zod";

export const LoginFormSchema = z.object({
    /** Either a user email or user name */
    credential: z.string(),
    /** The user's password */
    password: UserPasswordSchema,
});

export type LoginFormData = z.infer<typeof LoginFormSchema>;

export const RegisterFormSchema = z
    .object({
        /** The user's name */
        name: UserNameSchema,
        /** The user's email */
        email: UserEmailSchema,
        /** The user's password */
        password: UserPasswordSchema,
        /** The user's password confirmation */
        passwordConfirmation: UserPasswordSchema,
        /** The Google ReCAPTCHA token */
        reCaptchaToken: z.string(),
    })
    .superRefine((data, ctx) => {
        // Check if the passwords match.
        if (data.password !== data.passwordConfirmation) {
            ctx.addIssue({
                code: "custom",
                message: "Passwords do not match",
                path: ["passwordConfirmation"],
            });
            return false;
        }
        return true;
    });

export type RegisterFormData = z.infer<typeof RegisterFormSchema>;

/** The result of the data that is returned from registering or logging in. */
export type AuthResult = {
    id: string;
    name: string;
    email: string;
    token: string;
    image?: string;
    refreshToken: string;
};
