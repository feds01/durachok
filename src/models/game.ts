import {IUser} from "./user";
import mongoose, {Document, Schema} from 'mongoose';
import {GameState, GameStatus, HistoryState} from "shared";

export interface Player extends Document{
    name: string,
    socketId: string | null,
    confirmed: boolean,
    image: boolean,
    registered: boolean,
}

export interface IGame extends Document {
    pin: string,
    passphrase: string,
    maxPlayers: number,
    players: Player[],
    status: GameStatus,
    with2FA: boolean,
    randomPlayerOrder: boolean,
    roundTimeout: number,
    owner: IUser['_id'],
    game: {
        history: HistoryState,
        state: GameState,
    } | null,
}

const GameSchema = new Schema({
    pin: {type: String, required: true, unique: true},
    passphrase: {type: String, required: false},
    maxPlayers: {type: Number, required: true},
    players: {
        type: [{
            name: {type: String, required: true},
            socketId: {type: String, required: false},
            confirmed: {type: Boolean, required: true},
            registered: {type: Boolean, required: true},
        }],
        required: true
    },
    status: {type: String, required: true, default: GameStatus.WAITING},
    with2FA: {type: Boolean, required: true, default: false},
    randomPlayerOrder: {type: Boolean, required: true, default: false},
    roundTimeout: {type: Number, required: false, default: 120},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'user'},
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
                    hasVictory: {type: Boolean, default: false},
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
