import { ActionSchema, PlayerGameStateSchema, SpectatorGameStateSchema } from "../schemas/game";
import { LobbySchema } from "../schemas/lobby";
import { isDef } from "../utils";
import { z } from "zod";

const LobbyUpdateSchema = z.union([
    z.object({
        type: z.literal("new_player"),
    }),
    z.object({
        type: z.literal("settings_update"),
    }),
    z.object({
        type: z.literal("player_exit"),
    }),
    /** The game finished, and the lobby is waiting for another. */
    z.object({
        type: z.literal("game_over"),
    }),
]);

/**
 * An event that's generic to any users within a lobby, usually to
 * indicate
 */
export const LobbyMessageSchema = z.object({
    update: LobbyUpdateSchema,
    lobby: LobbySchema,
});

export type LobbyMessage = z.infer<typeof LobbyMessageSchema>;

/**
 * What a client is sent once they join a lobby, as `as` says they joined: the lobby, and the
 * game if one is being played, as `game` shows it to them.
 */
function joinSchema<A extends string, G extends z.ZodType>(as: A, game: G) {
    return z
        .object({
            /** Whether the client plays in the lobby or watches it, which says how `game` shows the game. */
            as: z.literal(as),
            lobby: LobbySchema,
            game: game.optional(),
            /** The version of the game that `game` shows, @see ActionMessageSchema. */
            gameVersion: z.number().int().optional(),
        })
        .refine(
            (value) => {
                // The lobby's status says whether a game is on, and zod can't tell the two shapes
                // apart by a field inside `lobby`, so this checks that a game comes with one.
                if (value.lobby.status === "playing") {
                    return isDef(value.game) && isDef(value.gameVersion);
                }

                return true;
            },
            {
                message: "Expected a game state when the game is playing.",
            },
        );
}

/**
 * What a client is sent once they join a lobby: a player, with the game as they see it, and a
 * spectator, with the game without anyone's cards.
 */
export const JoinMessageSchema = z.discriminatedUnion("as", [
    joinSchema("player", PlayerGameStateSchema),
    joinSchema("spectator", SpectatorGameStateSchema),
]);

export type JoinMessage = z.infer<typeof JoinMessageSchema>;

/** A player at the end of a game, and when they went out of it. */
const PlayerExitSchema = z.object({
    name: z.string(),
    /** When the player went out, as a timestamp, or null for the player who lost. */
    out: z.number().nullable(),
});

/**
 * Indicate to the client that the game has finished. The players are in the order
 * they went out of the game, so the first is the winner and the last is the durak.
 */
export const VictoryMessageSchema = z.object({
    players: z.array(PlayerExitSchema),
});

export type VictoryMessage = z.infer<typeof VictoryMessageSchema>;

/** Indicate to the client that the game was closed. */
export const CloseGameMessageSchema = z.object({
    reason: z.string(),
    extra: z.string().optional(),
});

/** The current state of the game for a particular state. */
export const StateUpdateMessageSchema = z.object({
    update: PlayerGameStateSchema,
    /** The version of the game that the update shows, @see ActionMessageSchema. */
    version: z.number().int(),
});

export type StateUpdateMessage = z.infer<typeof StateUpdateMessageSchema>;

/**
 * Indicate to the player that actions have occurred, with the game state that
 * they led to, from the player's perspective.
 */
export const ActionMessageSchema = z.object({
    actions: z.array(ActionSchema),
    update: PlayerGameStateSchema,
    /**
     * How many times the lobby's games have changed, counting on from one game to the
     * next. Updates can arrive out of order, so a client keeps the game with the highest
     * version that it was sent.
     */
    version: z.number().int(),
});

export type ActionMessage = z.infer<typeof ActionMessageSchema>;

/** Indicate to a spectator that actions have occurred, with the game that they led to, without anyone's cards. */
export const SpectatorActionMessageSchema = ActionMessageSchema.extend({
    update: SpectatorGameStateSchema,
});

export type SpectatorActionMessage = z.infer<typeof SpectatorActionMessageSchema>;

/** New tokens for the client, after the server refreshed its expired ones. */
export const TokensMessageSchema = z.object({
    token: z.string(),
    refreshToken: z.string(),
});

export type TokensMessage = z.infer<typeof TokensMessageSchema>;

/** Various types of errors that can occur. */
export const ErrorMessageTypeSchema = z.union([
    z.literal("internal"),
    z.literal("bad_request"),
    z.literal("not_found"),
    z.literal("unauthorized"),
    z.literal("invalid_move"),
    z.literal("stale_game"),
    /** The client sent more than the server takes in a while, and should slow down. */
    z.literal("too_many_requests"),
]);

export type ErrorMessageType = z.infer<typeof ErrorMessageTypeSchema>;

export const ErrorSummarySchema = z.record(
    z.string(),
    z.object({
        message: z.union([z.string(), z.array(z.string())]),
        code: z.number().optional(),
    }),
);

export type ErrorSummary = z.infer<typeof ErrorSummarySchema>;

/** Indicate to the player that an error has occurred. */
export const ErrorMessageSchema = z.object({
    /** The type of error that occurred. */
    type: ErrorMessageTypeSchema,
    /** An optional schema that indicates any details about the error, i.e. unprocessable fields. */
    details: ErrorSummarySchema.optional(),
    /** What went wrong, in words that the player can read. */
    message: z.string(),
});

export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
