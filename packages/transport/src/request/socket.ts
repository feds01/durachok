import { z } from "zod";

import { ActionSchema, GameSchema, GameStateSchema } from "../schemas/game";
import { LobbySchema } from "../schemas/lobby";

const LobbyUpdateSchema = z.union([
    z.object({
        type: z.literal("new_player"),
    }),
    z.object({
        type: z.literal("new_spectator"),
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

/**
 * An event that's emitted to a client once they have joined the
 * lobby.
 */
export const PlayerJoinSchema = z
    .object({
        lobby: LobbySchema,
        game: GameSchema.optional(),
    })
    .refine(
        (value) => {
            // @@Todo: potentially change the definition so that we can always
            // assume when a `playing` status is set, that the game state is
            // always present.
            return value.lobby.status === "playing" && !value.game;
        },
        {
            message: "Expected a game state when the game is playing.",
        },
    );

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
    /** Additional optional information about the error. */
    message: z.string().optional(),
});

export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
