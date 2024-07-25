import { Message } from "@durachok/transport/src/schemas/lobby";
import mongoose, { Document, Schema } from "mongoose";
import { GameState, GameStatus, HistoryState } from "shared";

import { Player } from "../schemas/lobby";
import { IUser } from "./user.model";

export interface IGame extends Document {
    pin: string;
    createdAt: Date;

    /* === Settings === */
    maxPlayers: number;
    passphrase?: string;
    shortGameDeck: boolean;
    freeForAll: boolean;
    disableChat: boolean;
    randomPlayerOrder: boolean;
    roundTimeout: number;

    /* === Game state === */
    players: Player[];
    status: GameStatus;
    chat: Message[];
    owner: IUser["_id"];
    game: {
        history: HistoryState;
        state: GameState;
    } | null;
}

export interface PopulatedGame extends IGame {
    owner: IUser;
}

const GameSchema = new Schema<IGame>({
    pin: { type: String, required: true, unique: true },
    passphrase: { type: String, required: false },
    players: {
        type: [
            {
                name: { type: String, required: true },
                socket: { type: String, required: false },
                confirmed: { type: Boolean, required: true },
                // @@Todo: potentially make this an `ObjectId`?
                registered: { type: String, required: false },
            },
        ],
        required: true,
    },
    createdAt: { type: Date, required: true, default: Date.now },
    status: { type: String, required: true, default: GameStatus.WAITING },

    maxPlayers: { type: Number, required: true },
    disableChat: { type: Boolean, required: true, default: false },
    randomPlayerOrder: { type: Boolean, required: true, default: false },
    shortGameDeck: { type: Boolean, required: true, default: false },
    freeForAll: { type: Boolean, required: true, default: true },
    roundTimeout: { type: Number, required: false, default: 120 },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    chat: {
        type: [
            {
                name: { type: String, required: true, default: "Anonymous" },
                time: { type: Number, required: true, default: Date.now },
                message: { type: String, required: true },
                owner: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: false,
                    ref: "user",
                },
            },
        ],
    },
    game: {
        type: {
            history: { type: Object, required: false, default: {} },
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
                    victory: { type: Boolean, default: false },
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
        required: false,
        default: {},
    },
});

export default mongoose.model<IGame>("game", GameSchema);
