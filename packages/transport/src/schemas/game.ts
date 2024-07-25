import { z } from "zod";

/** What state the game is currently in. */
export const GameStatusSchema = z.union([
  z.literal("waiting"),
  z.literal("playing"),
  z.literal("finished"),
]);

export type GameStatus = z.infer<typeof GameStatusSchema>;
