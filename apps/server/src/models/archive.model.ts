import mongoose, { Document, Schema } from "mongoose";
import { GameState, HistoryState } from "shared";

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
                            canAttack: { type: Boolean },
                            beganRound: { type: Boolean },
                            turned: { type: Boolean },
                            isDefending: { type: Boolean },
                        },
                    },
                    deck: { type: [String] },
                    victory: { type: Boolean },
                    trumpCard: {
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
