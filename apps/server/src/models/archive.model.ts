import { HistoryState } from "@durachok/engine/src";
import { GameState } from "@durachok/transport";
import mongoose, { HydratedDocument, Schema, Types } from "mongoose";

export interface IArchivedGame {
    maxPlayers: number;
    randomisePlayerOrder: boolean;
    owner: Types.ObjectId;
    game: {
        history: HistoryState;
        state: GameState;
    };
}

export type ArchivedGameDocument = HydratedDocument<IArchivedGame>;

const ArchivedGameSchema = new Schema<IArchivedGame>({
    // game preferences need to be preserved
    maxPlayers: { type: Number, required: true },
    randomisePlayerOrder: { type: Boolean, required: true },

    // owner details need to be preserved
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "user" },

    // the actual game needs to be preserved
    game: {
        type: {
            history: { type: Object, required: true },
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
        },
        required: true,
    },
});

export default mongoose.model<IArchivedGame>("archive", ArchivedGameSchema);
