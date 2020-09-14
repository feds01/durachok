import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
    pin: {type: Number, required: true, unique: true},
    maxPlayers: {type: Number, required: true},
    players: {type: Object, required: true},
    state: {type: Object, required: false},
    history: {type: Object, required: false},
    rngSeed: {type: String, required: true}
});

const GameModel = mongoose.model('game', gameSchema);

export default GameModel;
