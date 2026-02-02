import { GamePlayerSchema, GameSchema, GameStateSchema } from "@durachok/transport";
import { UserNameSchema } from "@durachok/transport";
import { ObjectId } from "mongodb";
import { z } from "zod";

/**
 * A reference to a game document, used for a query to select a game from a lobby.
 * */
export const DBGameSelectionSchema = z
    .object({
        /** Associated game document id, only exists after user is created. */
        _id: z.instanceof(ObjectId),
    })
    .transform(({ _id }) => ({ game: _id.toString() }));

export const DBGameSchema = GameSchema.extend({
    /* The unique identifier for the game. */
    _id: z.instanceof(ObjectId),

    /**
     * The state of the app, or specifically overrides that the DB
     * representation has.
     */
    state: GameStateSchema.extend({
        /**
         * A map of the cards on the game, each of the strings represents
         * a card in the game.
         */
        tableTop: z.map(z.string(), z.string().nullable()),

        /** A map between player name, and their game player entry.  */
        players: z.map(UserNameSchema, GamePlayerSchema),
    }),
}).transform(({ _id, ...data }) => {
    return { ...data, id: _id.toString() };
});
