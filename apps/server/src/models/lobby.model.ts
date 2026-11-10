import { GameStatus } from "@durachok/transport";
import { Message } from "@durachok/transport";
import mongoose, { HydratedDocument, MergeType, PopulateDocumentResult, Schema, Types } from "mongoose";

import { Versioned, versioning } from "../lib/database";
import { DBPlayer } from "../schemas/lobby";
import { IUser } from "./user.model";

export interface ILobby extends Versioned {
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
    /** Whether nobody is told how many cards are left in the deck or another player's hand. */
    mythicMode: boolean;
    allowSpectators: boolean;

    /* === Game state === */
    players: DBPlayer[];
    status: GameStatus;
    chat: Message[];
    /** Who the owner kicked out, who can't join again. */
    kicked: string[];
    owner: Types.ObjectId;
    game: Types.ObjectId | null;
}

export type LobbyDocument = HydratedDocument<ILobby>;

export interface PopulatedLobbyFields {
    owner: IUser;
}

// Type that matches what Mongoose's .populate<Pick<PopulatedLobbyFields, "owner">>() returns
export type PopulatedLobbyDocument = PopulateDocumentResult<
    LobbyDocument,
    Pick<PopulatedLobbyFields, "owner">,
    MergeType<ILobby, PopulatedLobbyFields>,
    ILobby
>;

const LobbySchema = new Schema<ILobby>({
    pin: { type: String, required: true, unique: true },
    passphrase: { type: String, required: false },
    players: {
        type: [
            {
                name: { type: String, required: true },
                socket: { type: String, required: false },
                confirmed: { type: Boolean, required: true },
                // The ID of the player's account, if they're registered.
                registered: { type: String, required: false },
                // The ID of the bot in the registry, if the player is a bot.
                bot: { type: String, required: false },
                // The secret of an anonymous player's place, which their tokens carry.
                seat: { type: String, required: false },
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
    mythicMode: { type: Boolean, required: true, default: false },
    allowSpectators: { type: Boolean, required: true, default: false },

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
                // The id of the registered user who sent it, a string as in `players.registered`.
                owner: { type: String, required: false },
            },
        ],
    },
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "game",
        required: false,
    },
    kicked: { type: [String], default: [] },
}).plugin(versioning);

export default mongoose.model<ILobby>("lobby", LobbySchema);
