import { TRPCError } from "@trpc/server";
import { Logger } from "winston";

import { UserInfo, UserRegistration, UserUpdate } from "../schemas/user";
import { expr, isDef } from "../utils";
import User, { IUser } from "./../models/user.model";
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

    /**
     * A method to get the user's credentials based on either email or
     * username.
     */
    public async getCredentials(input: {
        email?: string;
        name?: string;
    }): Promise<Credentials | undefined> {
        const { name, email } = input;

        const searchQuery = {
            $or: [
                ...(name ? [{ name: name }] : []),
                ...(email ? [{ email }] : []),
            ],
        };

        const user = await User.findOne(searchQuery);
        if (!user) {
            return;
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password,
        };
    }

    public async get(userId: string): Promise<UserInfo> {
        const user = await this.commonService.getUserDbObject(userId);

        // We need to enrich the user object with additional information, information such as
        // the user's image, the user's lobby, etc.
        const image = await expr(async () => {
            if (!user.image) {
                return;
            }

            return this.imageService.getUserImage(user.id);
        });
        const games = await this.lobbyService.getByOwner(user.id);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image,
            games,
            // @@Todo: compute statistics.
            // statistics: {}
        };
    }

    /** Create a new user. */
    public async create(
        details: Omit<UserRegistration, "reCaptchaToken">,
    ): Promise<UserInfo> {
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

            const saved = await user.save();
            return this.get(saved.id);
        } catch (e: unknown) {
            this.logger.error("Failed to create user", e);
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }

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
                user.image = true;
            }

            await user.save();
        } catch (e: unknown) {
            this.logger.error("Failed to update user", e);
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }

    public async delete(userId: string): Promise<void> {
        try {
            await User.deleteOne({ _id: userId });
        } catch (e: unknown) {
            this.logger.warn("Failed to delete user", e);
        }
    }
}
