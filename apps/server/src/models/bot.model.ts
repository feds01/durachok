import mongoose, { HydratedDocument, Schema } from "mongoose";

/**
 * A bot in the registry, which the server lets join lobbies as a player under its name.
 * A bot's tokens name its entry, so removing the entry shuts the bot out. How a bot
 * decides its moves is up to the bot, so the registry doesn't know.
 */
export interface IBotUser {
    name: string;
    /** What the bot is, for the people who play against it. */
    description: string;
    createdAt: Date;
}

export type BotUserDocument = HydratedDocument<IBotUser>;

const BotUserSchema = new Schema<IBotUser>({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true, default: "" },
    createdAt: { type: Date, required: true, default: Date.now },
});

export default mongoose.model<IBotUser>("bot_user", BotUserSchema);
