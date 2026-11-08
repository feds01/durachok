import { UserNameSchema } from "@durachok/transport";

import BotUsers, { BotUserDocument } from "../models/bot.model";
import { AuthService, Tokens } from "./auth";

/** A bot in the registry. */
export interface BotInfo {
    name: string;
    description: string;
    createdAt: Date;
}

/** Keeps the registry of the bots that the server lets join lobbies, @see IBotUser. */
export class BotService {
    public constructor(private readonly authService: AuthService) {}

    /**
     * Add a bot to the registry.
     *
     * @returns The bot's tokens, with which it joins lobbies.
     */
    public async register(name: string, description: string): Promise<Tokens> {
        UserNameSchema.parse(name);
        if (await BotUsers.exists({ name })) {
            throw new Error(`There is already a bot called ${name}`);
        }

        return this.tokensOf(await BotUsers.create({ name, description }));
    }

    /** New tokens for a bot in the registry, e.g. when its last ones expired. */
    public async tokensFor(name: string): Promise<Tokens> {
        const bot = await BotUsers.findOne({ name });
        if (!bot) {
            throw new Error(`There is no bot called ${name}`);
        }

        return this.tokensOf(bot);
    }

    /** The bots in the registry, oldest first. */
    public async list(): Promise<BotInfo[]> {
        const bots = await BotUsers.find().sort({ createdAt: 1 });
        return bots.map(({ name, description, createdAt }) => ({ name, description, createdAt }));
    }

    /**
     * Remove a bot from the registry, which shuts it out: its tokens no longer let it in.
     *
     * @returns Whether there was a bot with the name.
     */
    public async remove(name: string): Promise<boolean> {
        const { deletedCount } = await BotUsers.deleteOne({ name });
        return deletedCount > 0;
    }

    private tokensOf(bot: BotUserDocument): Tokens {
        return this.authService.createTokens({ name: bot.name, bot: bot.id });
    }
}
