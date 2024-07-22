import { z } from "zod";

export const GamePinSchema = z
    .string()
    .regex(/^\d{6}$/, "Game PIN is 6 digits long.");

/** Represents a game pin. */
export type GamePin = z.infer<typeof GamePinSchema>;

export const GamePassPhraseSchema = z
    .string()
    .regex(/^[♡♢♣♤]{4}$/, "Game passphrase must be 4 playing card symbols.");

/** Represents a game passphrase. */
export type GamePassPhrase = z.infer<typeof GamePassPhraseSchema>;
