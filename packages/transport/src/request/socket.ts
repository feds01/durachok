import { ActionSchema, PlayerGameStateSchema } from "../schemas/game";
import { LobbySchema } from "../schemas/lobby";
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
    z.object({
        type: z.literal("new_spectator"),
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
 * An event that's emitted to a client once they have joined the
 * lobby.
 */
export const PlayerJoinSchema = z
    .object({
        lobby: LobbySchema,
        game: PlayerGameStateSchema.optional(),
    })
    .refine(
        (value) => {
            // @@Todo: potentially change the definition so that we can always
            // assume when a `playing` status is set, that the game state is
            // always present.
            if (value.lobby.status === "playing") {
                return typeof value.game !== "undefined";
            }

            return true;
        },
        {
            message: "Expected a game state when the game is playing.",
        },
    );

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
});

/**
 * Indicate to the player that actions have occurred, with the game state that
 * they led to, from the player's perspective.
 */
export const ActionMessageSchema = z.object({
    actions: z.array(ActionSchema),
    update: PlayerGameStateSchema,
});

export type ActionMessage = z.infer<typeof ActionMessageSchema>;

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
