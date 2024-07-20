import { z } from "zod";

/** What state the game is currently in. */
export const GameStatusSchema = z.union([
    z.literal("waiting"),
    z.literal("playing"),
    z.literal("finished"),
]);

export type GameStatus = z.infer<typeof GameStatusSchema>;

/**
 * A simplified Lobby object containing only information
 * that is necessary for the client to know. I.E. This can
 * be used to indicate to the client what conditions the
 * lobby is in.
 * */
export const SimplifiedLobbySchema = z.object({
    pin: z.string(),
    joinable: z.boolean(),
    passphrase: z.boolean(),
    players: z.number(),
    status: GameStatusSchema,
    maxPlayers: z.number(),
});

export type SimplifiedLobby = z.infer<typeof SimplifiedLobbySchema>;
