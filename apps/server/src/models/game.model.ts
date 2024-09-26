import { HistoryState } from "@durachok/engine/src";
import { GameState } from "@durachok/transport/src/schemas/game";
import mongoose, { Document, Schema } from "mongoose";

export interface IGame extends Document {
    history: HistoryState;
    state: GameState;
}

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
});

export default mongoose.model<IGame>("game", GameSchema);
