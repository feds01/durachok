import { type UserInfo, type UserRegistration, UserUpdate } from "@durachok/transport";
import { TRPCError } from "@trpc/server";
import { Logger } from "pino";

import User, { UserDocument } from "../models/user.model";
import { isDef } from "../utils";
import { AuthService } from "./auth";
import { CommonService } from "./common";
import { ImageService } from "./image";
import { LobbyService } from "./lobby";

type Credentials = {
    /** User identifier. */
    id: string;
    /** User name. */
    name: string;
    /** User email. */
    email: string;
    /** User image. */
    image?: string;
    /** The hashed password stored in the DB. */
    password: string;
};

export class UserService {
    public constructor(
        private readonly logger: Logger,
        private readonly commonService: CommonService,
        private readonly authService: AuthService,
        private readonly imageService: ImageService,
        private readonly lobbyService: LobbyService,
    ) {}

    /** Get a user's image  as a URL. */
    private getUserImageURL(user: UserDocument): Promise<string | undefined> {
        if (!user.image) {
            return Promise.resolve(undefined);
        }

        return this.imageService.getUserImage(user.id);
    }

    /**
     * Get the user's credentials based on either email or username.
     */
    public async getCredentials(input: { email?: string; name?: string }): Promise<Credentials | undefined> {
        const { name, email } = input;

        const searchQuery = {
            $or: [...(name ? [{ name }] : []), ...(email ? [{ email }] : [])],
        };

        const user = await User.findOne(searchQuery);
        if (!user) {
            return;
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: await this.getUserImageURL(user),
            password: user.password,
        };
    }

    /** Get a user's information. */
    public async get(userId: string): Promise<UserInfo> {
        const user = await this.commonService.getUserDbObject(userId);

        // We need to enrich the user object with additional information, information such as
        // the user's image, the user's lobby, etc.
        const games = await this.lobbyService.getByOwner(user.id);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: await this.getUserImageURL(user),
            games,
            // @@Todo: compute statistics.
            // statistics: {}
        };
    }

    /** Create a new user. */
    public async create(details: Omit<UserRegistration, "reCaptchaToken">): Promise<UserInfo> {
        const { name, email, password, image } = details;

        // Check if the username or email is already taken.
        const userExists = await User.findOne({ $or: [{ name }, { email }] });

        if (isDef(userExists)) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "User email/username already taken",
            });
        }

        // Hash the password.
        const hashedPassword = await this.authService.hashPassword(password);

        try {
            const user = new User({
                name,
                email,
                password: hashedPassword,
                image: isDef(image),
            });

            if (isDef(image)) {
                await this.imageService.updateUserImage(user.id, image);
            }

            const saved = await user.save();
            return this.get(saved.id);
        } catch (e: unknown) {
            this.logger.error(e, `Failed to create user`);

            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }

    /** Update a user's information. */
    public async update(userId: string, info: UserUpdate): Promise<void> {
        const user = await this.commonService.getUserDbObject(userId);

        try {
            if (isDef(info.name)) {
                user.name = info.name;
            }

            if (isDef(info.email)) {
                user.email = info.email;
            }

            if (isDef(info.image)) {
                await this.imageService.updateUserImage(user.id, info.image);
                user.image = true;
            }

            await user.save();
        } catch (e: unknown) {
            this.logger.error(e, "Failed to update user");
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }

    public async delete(userId: string): Promise<void> {
        try {
            await User.deleteOne({ _id: userId });
            await this.imageService.deleteUserImage(userId);
        } catch (e: unknown) {
            this.logger.error(e, "Failed to delete user");
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }
}
