import { z } from "zod";

/** Settings for a game. */
export const GameSettingsSchema = z
  .object({
    /** The maximum number of players that can join the game. */
    maxPlayers: z.number().min(2).max(8),
    /** Whether to use a short deck in the game. */
    shortGameDeck: z.boolean().default(false),
    /** Whether users can play in any order after first turn. */
    freeForAll: z.boolean().default(true),
    /** Whether to disable the chat in the game. */
    disableChat: z.boolean().default(false),
    /** Whether to use `passphrase` when joining a game. */
    passphrase: z.boolean().default(false),
    /** Whether to randomise the player starting order. */
    randomPlayerOrder: z.boolean().default(false),
    /** Timeout in seconds. */
    roundTimeout: z.number().min(60).max(600),
  })
  .refine(
    (data) => {
      if (data.shortGameDeck) {
        return data.maxPlayers <= 6;
      }

      return true;
    },
    {
      message: "Short game deck can only be used with 6 players or less.",
      path: ["shortGameDeck"],
    },
  );

export type GameSettings = z.infer<typeof GameSettingsSchema>;
