import { GameStatusSchema } from "./game";
import { PlayerSchema } from "./user";
import { z } from "zod";

/** A Game PIN consists of 6 digits. */
export const GamePinSchema = z
    .string()
    .regex(/^\d{6}$/, "Game PIN is 6 digits long.");

export type GamePin = z.infer<typeof GamePinSchema>;

/** Represents a game passphrase, composed of the card suits. */
export const GamePassPhraseSchema = z
    .string()
    .regex(/^[♡♢♣♤]{4}$/, "Game passphrase must be 4 playing card symbols.");

export type GamePassPhrase = z.infer<typeof GamePassPhraseSchema>;

/** A message that is sent through the lobby.  */
export const MessageSchema = z.object({
    /** The name of the user that sent the message. */
    name: z.string(),
    /** The time that the message was sent. */
    time: z.number(),
    /** The owner of the message. */
    owner: z.string().optional(),
    /** The message that was sent. */
    message: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

/** A schema that represents the lobby settings. */
export const LobbySettingsSchema = z.object({
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
    randomisePlayerOrder: z.boolean(),
    /** Timeout in seconds. */
    roundTimeout: z.number().min(60).max(600),
});

export type LobbySettings = z.infer<typeof LobbySettingsSchema>;

export const LobbyStateSchema = z.object({
    /** Whether the game has started, waiting, or has finished. */
    status: GameStatusSchema,
    /** All players that are currently in the game. */
    players: z.array(PlayerSchema),
    /** Chats that are currently in the lobby. */
    chat: z.array(MessageSchema),
});

export type LobbyState = z.infer<typeof LobbyStateSchema>;

/** A game lobby, all publicly visible details to a user. */
export const LobbySchema = z
    .object({
        pin: GamePinSchema,
        /** The owner of the current lobby. */
        owner: PlayerSchema,
    })
    .merge(LobbySettingsSchema)
    .merge(LobbyStateSchema);

export type Lobby = z.infer<typeof LobbySchema>;
