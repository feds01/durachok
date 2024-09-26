import { HistoryState } from "@durachok/engine/src";
import { GameState } from "@durachok/transport/src/schemas/game";
import mongoose, { Document, Schema } from "mongoose";

import { IUser } from "./user.model";

export interface IArchivedGame extends Document {
    maxPlayers: number;
    randomisePlayerOrder: boolean;
    owner: IUser["_id"];
    game: {
        history: HistoryState;
        state: GameState;
    };
}

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
