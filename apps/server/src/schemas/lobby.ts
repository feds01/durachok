import { GameStatusSchema } from "@durachok/transport/src/schemas/game";
import {
    GamePassPhraseSchema,
    GamePinSchema,
    MessageSchema,
} from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { DBUserSchema } from "./user";

/** A player that is currently within the lobby. */
export const PlayerSchema = z.object({
    /** The name of the player in-game. */
    name: z.string(),
    /** The ID of the socket that the player is connected to on the server. */
    socket: z.string().nullable(),
    /** Whether the player has confirmed their participation in the game. */
    confirmed: z.boolean(),
    /** If it is a registered user, this is the ID of the user. */
    registered: z.string().optional(),
});

export type Player = z.infer<typeof PlayerSchema>;

/**
 * A lobby, containing information, including settings, chats and currently
 * active players.
 * */
export const LobbySchema = z.object({
    /** The unique identifier for the game. */
    pin: GamePinSchema,
    createdAt: z.date(),

    /* === Settings === */

    /** Maximum number of players in the lobby. */
    maxPlayers: z.number().min(2).max(8),
    /** Whether to use a short deck in the game. */
    shortGameDeck: z.boolean(),
    /** Whether users can play in any order after first turn. */
    freeForAll: z.boolean(),
    /** Whether to disable the chat in the game. */
    disableChat: z.boolean(),
    /** Whether to use `passphrase` when joining a game. */
    passphrase: GamePassPhraseSchema.optional(),
    /** Whether to randomise the player starting order. */
    randomPlayerOrder: z.boolean(),
    /** Timeout in seconds. */
    roundTimeout: z.number().min(60).max(600),

    /* === Game state === */

    /** Whether the game has started, waiting, or has finished. */
    status: GameStatusSchema,
    /** All players that are currently in the game. */
    players: z.array(PlayerSchema),
    /** Chats that are currently in the lobby. */
    chat: z.array(MessageSchema),
    /** The owner of the lobby. */
    owner: DBUserSchema,
});

export type Lobby = z.infer<typeof LobbySchema>;
