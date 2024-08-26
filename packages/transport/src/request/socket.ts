import { z } from "zod";

import { ActionSchema, GameStateSchema } from "../schemas/game";

const LobbyUpdateSchema = z.union([
    z.object({
        type: z.literal("new_player"),
    }),
    z.object({
        type: z.literal("new_spectator"),
    }),
]);

export const LobbyMessageSchema = z.object({
    update: LobbyUpdateSchema,
    // lobby: LobbySchema,
});

const PlayerExitSchema = z.object({
    name: z.string(),
    at: z.date(),
});

/** Indicate to the client that the lobby has reached a victory. */
export const VictoryMessageSchema = z.object({
    players: z.array(PlayerExitSchema),
});

/** Indicate to the client that the game was closed. */
export const CloseGameMessageSchema = z.object({
    reason: z.string(),
    extra: z.string().optional(),
});

/** The current state of the game. */
export const StateUpdateMessageSchema = z.object({
    update: GameStateSchema,
});

export const ActionWithTimeSchema = z.object({
    action: ActionSchema,
    occurred_at: z.date(),
});

/** Indicate to the player that an action has occurred. */
export const ActionMessageSchema = z.object({
    actions: z.array(ActionWithTimeSchema),
    update: GameStateSchema,
});

/** Various types of errors that can occur. */
export const ErrorMessageTypeSchema = z.union([
    z.literal("internal"),
    z.literal("bad_request"),
    z.literal("unauthorized"),
    z.literal("invalid_move"),
    z.literal("stale_game"),
]);

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
    /** Additional optional information about the error. */
    message: z.string().optional(),
});

export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
