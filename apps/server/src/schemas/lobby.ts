import { GameStatusSchema } from "@durachok/transport";
import {
    GamePinSchema,
    LobbySettingsSchema,
    MessageSchema,
} from "@durachok/transport";
import { ObjectId } from "mongodb";
import { z } from "zod";

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
});

export type DBPlayer = z.infer<typeof DBPlayerSchema>;

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

        /** Whether the game has started, waiting, or has finished. */
        status: GameStatusSchema,
        /** All players that are currently in the game. */
        players: z.array(DBPlayerSchema),
        /** Chats that are currently in the lobby. */
        chat: z.array(MessageSchema),
        /** The owner of the lobby. */
        owner: DBUserSchema,
    })
    .merge(LobbySettingsSchema)
    .transform(({ _id, __v, ...data }) => {
        return { ...data, id: _id.toString() };
    });

export type DBLobby = z.infer<typeof DBLobbySchema>;
