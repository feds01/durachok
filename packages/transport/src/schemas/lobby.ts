import { z } from "zod";

import { UserNameSchema } from "./user";

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
 * The information that must be provided in order to
 * join a game.
 */
export const GameJoinRequestSchema = z.object({
  pin: GamePinSchema,
  passphrase: GamePassPhraseSchema.optional(),
  name: UserNameSchema,
});

export type GameJoinRequest = z.infer<typeof GameJoinRequestSchema>;
