import { GameSettingsSchema } from "../request/game";
import {
    ActionMessageSchema,
    CloseGameMessageSchema,
    ErrorMessageSchema,
    LobbyMessageSchema,
    JoinMessageSchema,
    SpectatorActionMessageSchema,
    StateUpdateMessageSchema,
    TokensMessageSchema,
    VictoryMessageSchema,
} from "../request/socket";
import { PlayerMoveSchema } from "../schemas/game";
import { GamePinSchema, MessageSchema } from "../schemas/lobby";
import { UserNameSchema } from "../schemas/user";
import { z } from "zod";

/*
 * The socket protocol of a lobby: what a client sends the server, and what the server sends
 * a client, by event, as the arguments that the event carries. The server checks both
 * against these schemas, and a client is typed by them, @see LobbyClient.
 */

/** What a client sends the server. Each request names the lobby, by its pin, first. */
export const ClientEvents = {
    /** Join the lobby from this connection, which a client does whenever it connects. */
    join: z.tuple([GamePinSchema]),
    /** Leave the lobby, which a player can only do before the game starts, and the owner can't. */
    leave: z.tuple([GamePinSchema]),
    /** Remove a player from the lobby, by their name, which only the owner can do. */
    kick: z.tuple([GamePinSchema, z.object({ name: UserNameSchema })]),
    /** Send a message to the lobby's chat. */
    message: z.tuple([GamePinSchema, z.object({ message: z.string().trim().min(1).max(200) })]),
    /** Make a move in the game. */
    move: z.tuple([GamePinSchema, PlayerMoveSchema]),
    /** Start the game with the players who are connected, which only the owner can do. */
    start: z.tuple([GamePinSchema]),
    /** Give the lobby a new passphrase, which only the owner can do. */
    passphrase: z.tuple([GamePinSchema]),
    /** Change the lobby's settings, which only the owner can do, before the game starts. */
    settings: z.tuple([GamePinSchema, GameSettingsSchema]),
} satisfies Record<string, z.ZodTuple>;

/** What the server sends a client. */
export const ServerEvents = {
    /** New tokens for the client, when the ones that it connected with had expired. */
    tokens: z.tuple([TokensMessageSchema]),
    /** The lobby, and the game if one is being played, once the client joins the lobby. */
    join: z.tuple([JoinMessageSchema]),
    /** The lobby, whenever it changes: a player joins or leaves, the settings change, or a game ends. */
    lobbyState: z.tuple([LobbyMessageSchema]),
    /** The countdown before the game starts began. */
    countdown: z.tuple([]),
    /** The game started. */
    start: z.tuple([]),
    /** A new message in the lobby's chat. */
    message: z.tuple([MessageSchema]),
    /** The game finished, with the players in the order that they went out. */
    victory: z.tuple([VictoryMessageSchema]),
    /** The client is no longer in the lobby, e.g. because it was kicked, or the lobby was deleted. */
    close: z.tuple([CloseGameMessageSchema]),
    /** This player's view of the game, e.g. after the server refused their move. */
    playerState: z.tuple([StateUpdateMessageSchema]),
    /** What happened in the game, with this player's view of the game that it led to. */
    action: z.tuple([ActionMessageSchema]),
    /** What happened in the game, with the game that it led to as a spectator sees it. */
    spectate: z.tuple([SpectatorActionMessageSchema]),
    /** Something went wrong, e.g. a move that isn't allowed, or a request that isn't the client's to make. */
    error: z.tuple([ErrorMessageSchema]),
} satisfies Record<string, z.ZodTuple>;

/** An event that a client sends. */
export type ClientEvent = keyof typeof ClientEvents;

/** What a client sends with an event, after the lobby's pin. */
export type ClientEventArgs<E extends ClientEvent> =
    z.input<(typeof ClientEvents)[E]> extends [string, ...infer Rest] ? Rest : never;

/** An event that the server sends. */
export type ServerEvent = keyof typeof ServerEvents;

/** What the server sends with an event. */
export type ServerEventArgs<E extends ServerEvent> = z.output<(typeof ServerEvents)[E]>;
