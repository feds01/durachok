import { HistoryState } from "@durachok/engine";
import { GameState } from "@durachok/transport";
import mongoose, { HydratedDocument, Schema } from "mongoose";

import { Versioned, versioning } from "../lib/database";

/** A lobby's game. A lobby's games share one document, so a new game's version counts on from the last's. */
export interface IGame extends Versioned {
    history: HistoryState;
    state: GameState;
}

export type GameDocument = HydratedDocument<IGame>;

const GameSchema = new Schema<IGame>({
    history: { type: Object, required: false, default: {} },
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
}).plugin(versioning);

export default mongoose.model<IGame>("game", GameSchema);
