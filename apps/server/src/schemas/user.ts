import { UserNameSchema } from "@durachok/transport";
import { ObjectId } from "mongodb";
import { z } from "zod";

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
