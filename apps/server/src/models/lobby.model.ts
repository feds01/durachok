import { GameStatus } from "@durachok/transport";
import { Message } from "@durachok/transport";
import mongoose, { Document, Schema } from "mongoose";

import { DBPlayer } from "../schemas/lobby";
import { IGame } from "./game.model";
import { IUser } from "./user.model";

export interface ILobby extends Document {
    pin: string;
    createdAt: Date;

    /* === Settings === */
    maxPlayers: number;
    passphrase?: string;
    shortGameDeck: boolean;
    freeForAll: boolean;
    disableChat: boolean;
    randomisePlayerOrder: boolean;
    roundTimeout: number;

    /* === Game state === */
    players: DBPlayer[];
    status: GameStatus;
    chat: Message[];
    owner: IUser["_id"];
    game: IGame["_id"] | null;
}

export interface PopulatedLobby extends ILobby {
    owner: IUser;
}

const LobbySchema = new Schema<ILobby>({
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
    status: { type: String, required: true, default: "waiting" },

    maxPlayers: { type: Number, required: true },
    disableChat: { type: Boolean, required: true, default: false },
    randomisePlayerOrder: { type: Boolean, required: true, default: false },
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
        type: mongoose.Schema.Types.ObjectId,
        ref: "game",
        required: false,
    },
});

export default mongoose.model<ILobby>("lobby", LobbySchema);
