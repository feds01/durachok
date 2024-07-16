import {IUser} from "./user";
import mongoose, {Document, Schema} from 'mongoose';
import {GameState, GameStatus, HistoryState} from "shared";

export interface Player extends Document {
    name: string,
    socketId: string | null,
    confirmed: boolean,
    image: boolean,
    registered: boolean,
}

export interface Message extends Document {
    name: string,
    time: number,
    owner?: IUser['_id'],
    message: string,
}

export interface IGame extends Document {
    pin: string,
    passphrase: string,
    players: Player[],
    status: GameStatus,
    createdAt: number,

    /* Settings */
    maxPlayers: number,
    shortGameDeck: boolean,
    freeForAll: boolean,
    disableChat: boolean,
    with2FA: boolean,
    randomPlayerOrder: boolean,
    roundTimeout: number,

    chat: Message[],
    owner: IUser['_id'],
    game: {
        history: HistoryState,
        state: GameState,
    } | null,
}

export interface PopulatedGame extends IGame {
    owner: IUser
}

const GameSchema = new Schema({
    pin: {type: String, required: true, unique: true},
    passphrase: {type: String, required: false},
    players: {
        type: [{
            name: {type: String, required: true},
            socketId: {type: String, required: false},
            confirmed: {type: Boolean, required: true},
            registered: {type: Boolean, required: true},
        }],
        required: true
    },
    createdAt: {type: Date, required: true, default: Date.now},
    status: {type: String, required: true, default: GameStatus.WAITING},

    maxPlayers: {type: Number, required: true},
    disableChat: {type: Boolean, required: true, default: false},
    with2FA: {type: Boolean, required: true, default: false},
    randomPlayerOrder: {type: Boolean, required: true, default: false},
    shortGameDeck: {type: Boolean, required: true, default: false},
    freeForAll: {type: Boolean, required: true, default: true},
    roundTimeout: {type: Number, required: false, default: 120},

    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true},
    chat: {
        type: [{
            name: {type: String, required: true, default: "Anonymous"},
            time: {type: Number, required: true, default: Date.now},
            message: {type: String, required: true},
            owner: {type: mongoose.Schema.Types.ObjectId, required: false, ref: 'user'},
        }]
    },
    game: {
        type: {
            history: {type: Object, required: false, default: {}},
            state: {
                type: {
                    players: {
                        type: Map,
                        of: {
                            deck: {type: [String]},
                            canAttack: {type: Boolean},
                            beganRound: {type: Boolean},
                            turned: {type: Boolean},
                            isDefending: {type: Boolean}
                        }
                    },
                    deck: {type: [String]},
                    victory: {type: Boolean, default: false},
                    trumpCard: {
                        type: {
                            value: {type: Number},
                            suit: {type: String},
                            card: {type: String},
                        }
                    },
                    tableTop: {type: Map, of: String}
                }
            }
        },
        required: false,
        default: {}
    }
});

export default mongoose.model<IGame>('game', GameSchema);
