import {GameStatus} from "shared";
import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
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
    state: {type: Object, required: false},
    status: {type: String, required: true, default: GameStatus.WAITING},
    history: {type: Object, required: false},
    with2FA: {type: Boolean, required: true, default: false},
    randomPlayerOrder: {type: Boolean, required: true, default: false},
    roundTimeout: {type: Number, required: false, default: 120},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'user'},
    game: {
        type: {
            rngSeed: {type: String, required: false, default: ""},
            players: {
                type: [{
                    deck: {type: [String]},
                    canAttack: {type: Boolean},
                    beganRound: {type: Boolean},
                    turned: {type: Boolean},
                    isDefending: {type: Boolean}
                }]
            },
            deck: {type: [String]},
            history: {type: Object, required: false, default: {}},
            hasVictory: {type: Boolean, default: false},
            trumpCard: {
                type: {
                    value: {type: Number},
                    suit: {type: String},
                    card: {type: String},
                }
            },
            tableTop: {type: Map, of: String}
        },
        required: false,
        default: {}
    }
});

const GameModel = mongoose.model('game', gameSchema);

export default GameModel;
