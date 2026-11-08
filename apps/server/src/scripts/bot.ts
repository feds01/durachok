/**
 * Keep the registry of the bots that the server lets join lobbies, as `just bots` does:
 *
 *     add <name> [description]   Add a bot, and print its tokens
 *     token <name>               Print new tokens for a bot
 *     list                       List the bots
 *     remove <name>              Remove a bot, which shuts it out
 *
 * A bot joins lobbies with these tokens, which its program hands to `playInLobby` from
 * `@durachok/bots`.
 */
import mongoose from "mongoose";

import { MONGO_URI } from "../config";
import { AuthService, Tokens } from "../controllers/auth";
import { BotService } from "../controllers/bot";
import logger from "../lib/logger";

const USAGE = "usage: just bots add <name> [description] | token <name> | list | remove <name>";

function printTokens({ token, refreshToken }: Tokens) {
    console.log(`BOT_TOKEN=${token}`);
    console.log(`BOT_REFRESH_TOKEN=${refreshToken}`);
}

const [command, name, ...description] = process.argv.slice(2);
const bots = new BotService(new AuthService(logger));

await mongoose.connect(MONGO_URI);

try {
    switch (command) {
        case "add":
            if (!name) throw new Error(USAGE);
            printTokens(await bots.register(name, description.join(" ")));
            break;
        case "token":
            if (!name) throw new Error(USAGE);
            printTokens(await bots.tokensFor(name));
            break;
        case "list":
            for (const bot of await bots.list()) {
                console.log(`${bot.name}\t${bot.description}`);
            }
            break;
        case "remove":
            if (!name) throw new Error(USAGE);
            if (!(await bots.remove(name))) throw new Error(`There is no bot called ${name}`);
            console.log(`Removed ${name}, whose tokens no longer let it in`);
            break;
        default:
            throw new Error(USAGE);
    }
} catch (error: unknown) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
