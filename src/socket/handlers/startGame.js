import {error, events, game} from "shared";
import Lobby from "../../models/game";
import * as lobbyUtils from "../../utils/lobby";

import {ActiveGames} from "./../index";

async function handler(context, socket, io) {
    if (!socket.isAdmin) socket.emit(events.ERROR, new Error(error.UNAUTHORIZED));

    const lobby = await Lobby.findOne({pin: socket.lobby.pin});

    // check that there are at least 2 players in the lobby
    if (lobby.players.length < 2) {
        socket.emit(events.ERROR, new Error(error.BAD_REQUEST));
    }

    // update the game state to 'STARTED' since the game has started
    await Lobby.updateOne({_id: socket.lobby._id}, {status: game.GameState.STARTED});

    // fire countdown event
    io.of(lobby.pin.toString()).emit(events.COUNTDOWN);

    // TODO: add mechanism to wait for all clients to confirm that they have finished
    //       counting down and are ready to begin the game...
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec wait

    // Instantiate the game with the players and distribute the player cards to each player
    const players = await lobbyUtils.buildPlayerList(lobby);

    // fire game_started event and update the game state to 'PLAYING'
    io.of(lobby.pin.toString()).emit(events.GAME_STARTED);

    const Game = new game.Game(players);

    // save the game into the local game array
    // TODO: use mongo to save this object
    ActiveGames[lobby.pin] = Game;

    // iterate over each socket id in the 'namespace' that is connected and send them
    // the cards...
    Game.players.forEach(((value, key) => {
        const socketId = lobby.players.find(p => p.name === key).socketId;

        // send each player their cards, round metadata, etc...
        io.of(lobby.pin.toString()).sockets.get(socketId).emit(events.BEGIN_ROUND, {
            cards: value.deck,
            isDefending: value.isDefending,
            canAttack: value.canAttack,
            turned: value.turned,

            // TODO: send over trumpCard too
            trumpSuit: Game.trumpSuit,
            deckSize: Game.deck.length,

            // provide information about the table top
            tableTop: Object.fromEntries(Game.tableTop),

            // provide information about how many cards other players are holding
            players: Array.from(Game.players.entries())
                .filter(item => item[0] !== key)
                .map(item => ({[item[0]]: item[1].deck.length})),
        });
    }));

    await Lobby.updateOne({_id: socket.lobby._id}, {status: game.GameState.PLAYING});
}

export default handler;
