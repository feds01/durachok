import { z } from "zod";
import { DBUserSchema, UserNameSchema } from "./user";

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

/** What state the game is currently in. */
export const GameStatusSchema = z.union([
    z.literal('waiting'),
    z.literal('playing'),
    z.literal('finished'),
]);

export type GameStatus = z.infer<typeof GameStatusSchema>;

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

/** Settings for a game. */
export const GameSettingsSchema = z.object({
    /** The maximum number of players that can join the game. */
    maxPlayers: z.number().min(2).max(8),
    /** Whether to use a short deck in the game. */
    shortGameDeck: z.boolean().default(false),
    /** Whether users can play in any order after first turn. */
    freeForAll: z.boolean().default(true),
    /** Whether to disable the chat in the game. */
    disableChat: z.boolean().default(false),
    /** Whether to use `passphrase` when joining a game. */
    passphrase: z.boolean().default(false),
    /** Whether to randomise the player starting order. */
    randomPlayerOrder: z.boolean().default(false),
    /** Timeout in seconds. */
    roundTimeout: z.number().min(60).max(600),
}).refine(data => {
    if (data.shortGameDeck) {
        return data.maxPlayers <= 6;
    }

    return true;
}, { message: "Short game deck can only be used with 6 players or less." });

export type GameSettings = z.infer<typeof GameSettingsSchema>;

/**
 * The information that must be provided in order to
 * create a game.
 */
export const GameCreateRequestSchema = z.object({
    settings: GameSettingsSchema,
});

export type GameCreateRequest = z.infer<typeof GameCreateRequestSchema>;

/** 
 * The information that must be provided in order to 
 * join a game.
 */
export const GameJoinRequestSchema = z.object({
    pin: GamePinSchema,
    passphrase: GamePassPhraseSchema.optional(),
    name: UserNameSchema,
});

export type GameJoinRequest = z.infer<typeof GameJoinRequestSchema>;


/** Query some kind of information by a game `pin`. */
export const ByPinRequestSchema = z.object({
    pin: GamePinSchema,
});

export type ByPinRequest = z.infer<typeof ByPinRequestSchema>;
