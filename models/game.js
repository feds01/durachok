import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
    id: {type: Number, required: true},
    maxPlayers: {type: Number, required: true},
    players: {type: Object, required: true},
    state: {type: Object, required: false},
    history: {type: Object, required: false},
    rngSeed: {type: String, required: true}
});

const gameModel = mongoose.Model('game', gameSchema);

export default gameModel;
