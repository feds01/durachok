import { HistoryState } from "@durachok/engine";
import { GameState } from "@durachok/transport";
import mongoose, { HydratedDocument, Schema } from "mongoose";

import { countChanges } from "../lib/database";

export interface IGame {
    history: HistoryState;
    state: GameState;
    /**
     * How many times the lobby's games have changed, @see countChanges. A lobby's games share
     * one document, so a new game counts on from the last.
     */
    version: number;
}

export type GameDocument = HydratedDocument<IGame>;

const GameSchema = new Schema<IGame>({
    history: { type: Object, required: false, default: {} },
    version: { type: Number, required: true, default: 0 },
    state: {
        type: {
            players: {
                type: Map,
                of: {
                    deck: { type: [String] },
                    name: { type: String },
                    action: { type: String, default: "none" },
                    beganRound: { type: Boolean, default: false },
                    out: { type: Number, default: null },
                    turned: { type: Boolean, default: false },
                },
            },
            deck: { type: [String] },
            status: { type: String, default: "waiting" },
            trump: {
                type: {
                    value: { type: Number },
                    suit: { type: String },
                    card: { type: String },
                },
            },
            tableTop: { type: Map, of: String },
        },
    },
});

countChanges(GameSchema);

export default mongoose.model<IGame>("game", GameSchema);
