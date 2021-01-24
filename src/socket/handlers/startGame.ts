import {Server, Socket} from "socket.io";
import {getLobby} from "../getLobby";
import Lobby from "../../models/game";
import * as lobbyUtils from "../../utils/lobby";
import {Game, error, ClientEvents, GameStatus} from "shared";


async function handler(context: any, socket: Socket, io?: Server | null) {
    if (!socket.isAdmin) socket.emit(ClientEvents.ERROR, new Error(error.UNAUTHORIZED));

    const lobby = await getLobby(socket.lobby.pin);

    // don't start the game if the game has already been started, just silently fail.
    if (lobby.status !== GameStatus.WAITING) {
        return;
    }

    // check that there are at least 2 players in the lobby
    const confirmedPlayers = lobby.players.filter(p => p.confirmed);

    if (confirmedPlayers.length < 2) {
        socket.emit(ClientEvents.ERROR, new Error(error.BAD_REQUEST));
    }

    // update the game state to 'STARTED' since the game has started
    const updatedLobby = await Lobby.findOneAndUpdate(
        {_id: lobby._id},
        {$set: {players: confirmedPlayers, status: GameStatus.STARTED}},
        {new: true}
    );

    io!.of(lobby.pin.toString()).emit(ClientEvents.COUNTDOWN);

    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec wait

    // Instantiate the game with the players and distribute the player cards to each player
    const players = lobbyUtils.buildPlayerList(updatedLobby!).map(p => p.name);

    // fire game_started event and update the game state to 'PLAYING'
    io!.of(lobby.pin.toString()).emit(ClientEvents.GAME_STARTED);

    const game = new Game(players, null, {
        randomisePlayerOrder: socket.lobby.randomPlayerOrder
    });

    // save the game into mongo
    await Lobby.updateOne({_id: socket.lobby._id}, {game: game.serialize()});

    // iterate over each socket id in the 'namespace' that is connected and send them
    // the cards...
    game.players.forEach(((value, key) => {
        const socketId = lobby.players.find(p => p.name === key)!.socketId;

        // This shouldn't happen, but if it does we should prevent trying to send a
        // message to a null client.
        if (!socketId) return;

        // panic, one of the clients disconnected...
        if (typeof io!.of(lobby.pin.toString()).sockets.get(socketId) === 'undefined') {
            console.log("player disconnected pre-maturely, we should reset to waiting room.");
            return;
        }

        // send each player their cards, round metadata, etc...
        io!.of(lobby.pin.toString()).sockets.get(socketId)!.emit(ClientEvents.BEGIN_ROUND, {
            meta: game.history.getLastNode()!.actions,
            state: game.getStateForPlayer(key)
        });
    }));

    await Lobby.updateOne({_id: socket.lobby._id}, {status: GameStatus.PLAYING});
}

export default handler;
