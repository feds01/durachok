import { UserNameSchema } from "./user";
import { z } from "zod";

/** What state the game is currently in. */
export const GameStatusSchema = z.union([z.literal("waiting"), z.literal("playing"), z.literal("finished")]);

export type GameStatus = z.infer<typeof GameStatusSchema>;

/** All player actions that can occur. */
export const PlayerActionSchema = z.union([
    /** An attacker places a card on the playing field. */
    z.object({
        type: z.literal("place"),
        card: z.string(),
        player: UserNameSchema,
    }),
    /** A defender covers a card on the playing field. */
    z.object({
        type: z.literal("cover"),
        card: z.string(),
        player: UserNameSchema,
        on: z.number(),
    }),
    /** The act of a player forfeiting the round and picking up all of the table cards. */
    z.object({
        type: z.literal("forfeit"),
        player: UserNameSchema,
    }),
    /** A player picks of several cards to replenish their deck. */
    z.object({
        type: z.literal("pickup"),
        cards: z.array(z.string()),
        player: UserNameSchema,
    }),
]);

export type PlayerAction = z.infer<typeof PlayerActionSchema>;

/**
 * In an act which involves two players, this indicates the attacking player and
 * the defending player.
 */
export const ActorsSchema = z.object({
    defender: UserNameSchema,
    attacker: UserNameSchema,
});

export type Actors = z.infer<typeof ActorsSchema>;

/** All autonomous actions that can occur. */
export const AutonomousActionSchema = z.union([
    /** The player leaves the game. */
    z.object({
        type: z.literal("exit"),
        player: UserNameSchema,
    }),
    /** The lobby's owner removes a player from the game, whose cards leave play. */
    z.object({
        type: z.literal("remove"),
        player: UserNameSchema,
    }),
    /** The completion of a game. */
    z.object({
        type: z.literal("victory"),
    }),
    /** The act of starting a new round. */
    z.object({
        type: z.literal("new_round"),
        actors: ActorsSchema,
    }),
    z.object({
        type: z.literal("start"),
        actors: ActorsSchema,
    }),
]);

export type AutonomousAction = z.infer<typeof AutonomousActionSchema>;

/** The combination of either `AutonomousAction` or `PlayerAction` */
export const ActionSchema = z.union([PlayerActionSchema, AutonomousActionSchema]);

export type Action = z.infer<typeof ActionSchema>;

/** A card, with its suit, as the trump is sent. Its value comes from the card string, @see cardFromString. */
export const CardSchema = z.object({
    /** The suit of the card. */
    suit: z.string(),
    /** The card string. */
    card: z.string(),
});

export type Card = z.infer<typeof CardSchema>;

/** The role that a player can take in the round of a game. */
export const PlayerRoleSchema = z.union([
    /** The player can attack. */
    z.literal("attack"),
    /** The player must defend against an attack. */
    z.literal("defend"),
    /** The player can't yet attack. */
    z.literal("none"),
]);

export type PlayerRole = z.infer<typeof PlayerRoleSchema>;

/**
 * The deck state of the player. Either indicates the cards
 * that the player has, or merely a count of the cards.
 */
export const PlayerDeckStateSchema = z.union([
    /** The player has a visible deck. */
    z.object({
        type: z.literal("visible"),
        cards: z.array(z.string()),
    }),
    /** The player has a hidden deck. */
    z.object({
        type: z.literal("hidden"),
        /** How many cards the player holds, or null in mythic mode, where nobody is told. */
        size: z.number().nullable(),
    }),
]);

export type PlayerDeckState = z.infer<typeof PlayerDeckStateSchema>;

/** The current player state. */
export const OpaquePlayerStateSchema = z.object({
    /** The name of the player. */
    name: UserNameSchema,
    /** The deck of the player. */
    deck: PlayerDeckStateSchema,
    /** Whether the player has finished the game. */
    out: z.number().nullable(),
    /**
     * Whether the lobby's owner removed the player from the game. They're out of it, as
     * `out` says, but they didn't go out by playing, so they have no place.
     */
    removed: z.boolean().optional(),
    /** Whether the player has finished the round. */
    turned: z.boolean(),
    /** Whether the player has started the round. */
    beganRound: z.boolean(),
    /** What can the player do. */
    action: PlayerRoleSchema,
});

export type OpaquePlayerState = z.infer<typeof OpaquePlayerStateSchema>;

/**
 * A player object, only overriding `OpaquePlayerState` to always know
 * the deck, this is useful in particular to the `GameState` and the engine.
 */
export const GamePlayerSchema = OpaquePlayerStateSchema.omit({
    deck: true,
}).extend({
    deck: z.array(z.string()),
});

export type GamePlayer = z.infer<typeof GamePlayerSchema>;

/** A player move. */
export const PlayerMoveSchema = z.union([
    /** An attacker places a card on the table. */
    z.object({ type: z.literal("place"), card: z.string() }),
    /** A player covers a card on the table. */
    z.object({
        type: z.literal("cover"),
        position: z.number().min(0).max(5).int(),
        card: z.string(),
    }),
    /** The act of forfeiting a round. */
    z.object({ type: z.literal("forfeit") }),
]);

export type PlayerMove = z.infer<typeof PlayerMoveSchema>;

/** Whether two moves are the same one. */
export function isSameMove(a: PlayerMove, b: PlayerMove): boolean {
    switch (a.type) {
        case "place":
            return b.type === "place" && a.card === b.card;
        case "cover":
            return b.type === "cover" && a.card === b.card && a.position === b.position;
        case "forfeit":
            return b.type === "forfeit";
    }
}

/** Whether an action is a move that a player made. */
export function isMoveBy(action: Action, name: string): boolean {
    return (action.type === "place" || action.type === "cover" || action.type === "forfeit") && action.player === name;
}

/** The current game state. */
export const GameStateSchema = z.object({
    /** The current status of the game. */
    status: GameStatusSchema,
    /** The current trump card of the game. */
    trump: CardSchema,
    /** The players in the game. */
    players: z.record(z.string(), GamePlayerSchema),
    /** The playing table top state. */
    tableTop: z.record(z.string(), z.string().nullable()),
    /** The remaining deck of cards. */
    deck: z.array(z.string()),
});

export type GameState = z.infer<typeof GameStateSchema>;

/** The state of the game for each player. */
export const PlayerGameStateSchema = z.object({
    /** The player's own state, including the cards that they hold. */
    player: GamePlayerSchema,
    /**
     * The state of each player in the current game, from the
     * perspective of the current player. This is relevant because
     * this changes what the player "knows" about the game, i.e. what
     * cards other players have.
     */
    players: z.array(OpaquePlayerStateSchema),
    /** The current state of the game. */
    tableTop: z.record(z.string(), z.string().nullable()),
    /**
     * How many cards are left to draw, or null in mythic mode while some are, where the
     * players only see that the deck isn't empty.
     */
    deckSize: z.number().nullable(),
    /**
     * How many cards were beaten and put aside, or null in mythic mode once some are, where
     * the players only see that the pile isn't empty.
     */
    discardSize: z.number().nullable(),
    /** The trump card. */
    trump: CardSchema,
});

export type PlayerGameState = z.infer<typeof PlayerGameStateSchema>;

/** The state of the game for a spectator, which doesn't reveal anyone's cards. */
export const SpectatorGameStateSchema = PlayerGameStateSchema.omit({ player: true });

export type SpectatorGameState = z.infer<typeof SpectatorGameStateSchema>;

export const GameHistorySchema = z.object({
    /** The game history. */
    nodes: z.array(ActionSchema),
});

export type GameHistory = z.infer<typeof GameHistorySchema>;

/**
 * A full game object, including the game state and the
 * game history.
 */
export const GameSchema = z.object({
    /** The current game state. */
    state: GameStateSchema,
    /** The game history. */
    history: GameHistorySchema,
});

export type Game = z.infer<typeof GameSchema>;
