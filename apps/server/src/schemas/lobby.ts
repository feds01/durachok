import { GameStatusSchema } from "@durachok/transport";
import { GamePinSchema, LobbySettingsSchema, MessageSchema } from "@durachok/transport";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { isDef } from "../utils";
import type { TokenPayload } from "./auth";
import { DBUserSchema } from "./user";

/** A player that is currently within the lobby. */
export const DBPlayerSchema = z.object({
    /** The name of the player in-game. */
    name: z.string(),
    /** The ID of the socket that the player is connected to on the server. */
    socket: z.string().nullable(),
    /** Whether the player has confirmed their participation in the game. */
    confirmed: z.boolean(),
    /** If it is a registered user, this is the ID of the user. */
    registered: z.string().optional(),
    /** If it is a bot, this is the ID of the bot in the registry. */
    bot: z.string().optional(),
    /**
     * If it is a player without an account, the secret of their place, which their tokens carry,
     * so that only they can take it: not someone with an old token for the same name and pin,
     * from when the name or the pin was someone else's.
     */
    seat: z.string().optional(),
});

export type DBPlayer = z.infer<typeof DBPlayerSchema>;

/**
 * Whether a token is a player's: a user's by their account, a bot's by its entry in the registry,
 * and an anonymous player's by the secret of their place, which only their tokens carry.
 */
export function isPlayer(token: TokenPayload, player: DBPlayer): boolean {
    switch (token.kind) {
        case "registered":
            return player.registered === token.user.id;
        case "bot":
            return player.bot === token.bot.id;
        case "anonymous":
            return isDef(player.seat) && player.seat === token.seat && player.name === token.name;
        case "spectator":
            return false;
    }
}

/**
 * Who a player is, as a lobby remembers the players that its owner kicked out: a user by their
 * account, a bot by the registry, and a player without an account by their name, which is all
 * that is known of them, so that they can only come back under another.
 */
export function identityOf(player: Pick<DBPlayer, "name" | "registered" | "bot">): string {
    if (isDef(player.registered)) {
        return `user:${player.registered}`;
    }
    if (isDef(player.bot)) {
        return `bot:${player.bot}`;
    }
    return `name:${player.name}`;
}

/**
 * A lobby, containing information, including settings, chats and currently
 * active players.
 * */
export const DBLobbySchema = z
    .object({
        /** Associated user id, only exists after user is created. */
        _id: z.instanceof(ObjectId),
        __v: z.number(),

        /** The unique identifier for the game. */
        pin: GamePinSchema,
        createdAt: z.date(),

        /* === Game state === */

        /** How many times the lobby has changed, @see Versioned. */
        version: z.number(),

        /** Whether the game has started, waiting, or has finished. */
        status: GameStatusSchema,
        /** All players that are currently in the game. */
        players: z.array(DBPlayerSchema),
        /** Chats that are currently in the lobby. */
        chat: z.array(MessageSchema),
        /** Who the owner kicked out, who can't join again, @see identityOf. */
        kicked: z.array(z.string()).default([]),
        /** The owner of the lobby. */
        owner: DBUserSchema,
    })
    .merge(LobbySettingsSchema)
    .transform(({ _id, __v, ...data }) => {
        return { ...data, id: _id.toString() };
    });

export type DBLobby = z.infer<typeof DBLobbySchema>;
