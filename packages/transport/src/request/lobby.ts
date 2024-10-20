import { z } from "zod";

import { GameSettingsSchema } from "@/request/game";
import { GameStatusSchema } from "@/schemas/game";
import { GamePassPhraseSchema, GamePinSchema } from "@/schemas/lobby";
import { UserNameSchema } from "@/schemas/user";

/** Query some kind of information by a game `pin`. */
export const ByPinRequestSchema = z.object({
    pin: GamePinSchema,
});

export type ByPinRequest = z.infer<typeof ByPinRequestSchema>;

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

/**
 * The information that must be provided in order to
 * create a game.
 */
export const GameCreateRequestSchema = z.object({
    settings: GameSettingsSchema,
});

export type GameCreateRequest = z.infer<typeof GameCreateRequestSchema>;

/**
 * A request to check if a name is free in a lobby.
 */
export const NameFreeInLobbyRequestSchema = ByPinRequestSchema.extend({
    name: UserNameSchema,
});

export type NameFreeInLobbyRequest = z.infer<
    typeof NameFreeInLobbyRequestSchema
>;

/**
 * A simplified Lobby object containing only information
 * that is necessary for the client to know. I.E. This can
 * be used to indicate to the client what conditions the
 * lobby is in.
 * */
export const LobbyInfoSchema = z.object({
    pin: z.string(),
    joinable: z.boolean(),
    passphrase: z.boolean(),
    players: z.number(),
    status: GameStatusSchema,
    maxPlayers: z.number(),
});

export type LobbyInfo = z.infer<typeof LobbyInfoSchema>;
