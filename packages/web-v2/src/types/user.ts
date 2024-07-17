import { z } from "zod";

export const UserRegistrationRequest = z.object({
    name: z.string(),
    email: z.string(),
    password: z.string(),
    /** This is the re-captcha token */
    token: z.string(),
});

export type UserRegistrationRequest = z.infer<typeof UserRegistrationRequest>;
