import {getLobby} from "../getLobby";
import Lobby from "../../models/game";
import {Server, Socket} from "socket.io";
import * as lobbyUtils from "../../utils/lobby";
import {acquireLock, releaseLock} from "../lock";
import {Game, error, ClientEvents, GameStatus, ServerEvents} from "shared";


async function handler(context: any, socket: Socket, io?: Server | null) {
    const meta = {pin: socket.lobby.pin, event: ServerEvents.START_GAME};
    const lobby = await getLobby(socket.lobby.pin);

    if (!socket.decoded) return; // ignore messages from spectator

    socket.logger.info("Attempting to start a game", {...meta, name: socket.decoded.name});
    let lock;

    try {
        lock = acquireLock(socket.lobby.pin);
    } catch (e) {
        socket.logger.warn("Failed to acquire lock", meta);
        return;
    }

    if (!socket.isAdmin) socket.emit(ClientEvents.ERROR, new Error(error.UNAUTHORIZED));

    // don't start the game if the game has already been started, just silently fail.
    if (lobby.status !== GameStatus.WAITING) {
        socket.logger.warn("Cannot start game when game in progress", meta);
        return;
    }

    // check that there are at least 2 players in the lobby
    const confirmedPlayers = lobby.players.filter(p => p.confirmed);

    if (confirmedPlayers.length < 2) {
        socket.logger.warn("Cannot start game with less than 2 players", meta);
        socket.emit(ClientEvents.ERROR, new Error(error.BAD_REQUEST));
    }

    // update the game state to 'STARTED' since the game has started
    const updatedLobby = await Lobby.findOneAndUpdate(
        {_id: lobby._id},
        {$set: {players: confirmedPlayers, status: GameStatus.STARTED}},
        {new: true}
    );

    socket.logger.info("Initiating countdown stage", meta);
    io!.of(lobby.pin.toString()).emit(ClientEvents.COUNTDOWN);

    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec wait

    // Instantiate the game with the players and distribute the player cards to each player
    const players = lobbyUtils.buildPlayerList(updatedLobby!).map(p => p.name!);

    // fire game_started event and update the game state to 'PLAYING'
    io!.of(lobby.pin.toString()).emit(ClientEvents.GAME_STARTED);

    const {randomPlayerOrder, shortGameDeck, freeForAll} = socket.lobby;
    socket.logger.info(`Creating game with ${JSON.stringify({randomPlayerOrder, shortGameDeck, freeForAll})}`, meta);

    const game = new Game(players, null, {
        randomisePlayerOrder: socket.lobby.randomPlayerOrder,
        shortGameDeck,
        freeForAll,
    });
    game.deck = [];

    // save the game into mongo
    await Lobby.updateOne({_id: socket.lobby._id}, {game: game.serialize(), createdAt: Date.now()});

    // iterate over each socket id in the 'namespace' that is connected and send them
    // the cards...
    game.players.forEach(((value, key) => {
        const socketId = lobby.players.find(p => p.name === key)!.socketId;

        // This shouldn't happen, but if it does we should prevent trying to send a
        // message to a null client.
        if (!socketId) return;

        // panic, one of the clients disconnected...
        if (typeof io!.of(lobby.pin.toString()).sockets.get(socketId) === 'undefined') {
            socket.logger.warn("player disconnected pre-maturely!", {...meta, name: key});
            return;
        }

        // send each player their cards, round metadata, etc...
        io!.of(lobby.pin.toString()).sockets.get(socketId)!.emit(ClientEvents.BEGIN_ROUND, {
            meta: game.history.getLastNode()!.actions,
            update: game.getStateForPlayer(key)
        });
    }));

    socket.logger.info("Transferring lobby into playing state...", meta);
    await Lobby.updateOne({_id: socket.lobby._id}, {status: GameStatus.PLAYING});

    // Release the lock
    releaseLock(lock);
}

export default handler;
