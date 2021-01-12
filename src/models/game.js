import mongoose from 'mongoose';
import {game} from "shared";

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
    status: {type: String, required: true, default: game.GameState.WAITING},
    history: {type: Object, required: false},
    rngSeed: {type: String, required: true},
    with2FA: {type: Boolean, required: true, default: false},
    roundTimeout: {type: Number, required: false, default: 120},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'user'},
    game: {
        type: {
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
