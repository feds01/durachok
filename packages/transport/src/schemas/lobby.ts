import { z } from "zod";

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

/** A message that is sent through the lobby.  */
export const MessageSchema = z.object({
  /** The name of the user that sent the message. */
  name: z.string(),
  /** The time that the message was sent. */
  time: z.number(),
  /** The owner of the message. */
  owner: z.string().optional(),
  /** The message that was sent. */
  message: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;
