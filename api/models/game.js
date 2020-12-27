import mongoose from 'mongoose';
import {GameState} from "../common/game";

const gameSchema = new mongoose.Schema({
    pin: {type: String, required: true, unique: true},
    passphrase: {type: String, required: false},
    maxPlayers: {type: Number, required: true},
    players: {type: Array, required: true},
    state: {type: Object, required: false},
    status: {type: String, required: true, default: GameState.WAITING},
    history: {type: Object, required: false},
    rngSeed: {type: String, required: true},
    roundTimeout: {type: Number, required: false, default: 120},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'user'},
});

const GameModel = mongoose.model('game', gameSchema);

export default GameModel;
