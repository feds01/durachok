import {Server} from "socket.io";
import jwt from "jsonwebtoken";
import Lobby from "./src/models/game";
import {error, events, game} from "shared";
import Player from "./src/models/user";
import * as lobbyUtils from "./src/utils/lobby";
import {refreshTokens} from "./src/authentication";


export const makeSocketServer = (server) => {
    const io = new Server(server, {});
    const lobbies = io.of(/^\/\d{6}$/);

    /**
     * Middleware function to check that the attempted lobby join exists.
     * */
    lobbies.use(async (socket, next) => {
        const lobbyPin = socket.nsp.name.split("/")[1];

        // check that a game exists with the provided pin
        const lobby = await Lobby.findOne({pin: lobbyPin});

        if (!lobby) {
            return next(new Error(error.NON_EXISTENT_LOBBY));
        }

        socket.lobby = lobby;
        next();
    });

    lobbies.use((socket, next) => {
        if (socket.handshake.query && socket.handshake.query.token) {
            jwt.verify(socket.handshake.query.token, process.env.JWT_SECRET_KEY, async (err, decoded) => {

                // Attempt to verify if the user sent a refreshToken
                if (err) {
                    if (!socket.handshake.query.refreshToken) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }

                    // If the refreshToken fails we can't be sure if this is a valid request or an expired
                    // one, therefore we should just prevent the handshake from succeeding.
                    try {
                        const newTokens = await refreshTokens(socket.handshake.query.refreshToken);


                        // @nocheckin
                        console.log("REFRESHING_TOKEN", socket.id);

                        // emit a 'token' event so that the client can update their copy of the token, refreshTokens
                        // TODO: move 'token' event name into shared/events
                        socket.emit("token", {...newTokens});
                    } catch (e) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }
                }

                // check that the nsp matched the pin or the user of the Durachok
                // service is the owner of this lobby.
                const isAdmin = typeof decoded.id !== "undefined";

                if (isAdmin) {
                    const user = await Player.findOne({_id: decoded.id});

                    // This shouldn't happen unless the user was deleted and the token is stale.
                    if (!user) {
                        console.log("couldn't find player");
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }

                    // check that id of the owner is equal to the id in the JWT
                    if (user._id.toString() !== socket.lobby.owner._id.toString()) {
                        return next(new Error(error.AUTHENTICATION_FAILED));
                    }
                }

                if (!isAdmin && socket.lobby.pin !== decoded.pin) {
                    return next(new Error(error.AUTHENTICATION_FAILED));
                }

                socket.isAdmin = isAdmin;
                socket.decoded = decoded;
                next();
            });
        } else {
            next(new Error(error.AUTHENTICATION_FAILED));
        }
    });

    lobbies.on('connect', (socket) => {
        socket.on("disconnecting", async () => {
            // if the socket connection is not an admin, we need to remove it from
            // the player lobby and free up a space.
            if (!socket.isAdmin) {
                const lobby = await Lobby.findOne({pin: socket.lobby.pin});

                // TODO: what happens when the game is in progress and one of the players leave?
                //       .
                //       1). Potentially, the game has to be restarted and some condition is used to
                //       determine which player leaves when winning the lobby.
                //       .
                //       2). A secondary solution is to use a bot service that plays for the other
                //           player when the original player leaves...
                if (lobby.status === game.GameState.PLAYING) {
                    console.log("Removing player from game whilst in session...");
                }

                // Remove the player from the list
                if (lobby.status === game.GameState.WAITING) {
                    const players = lobby.players;
                    const playerIdx = players.findIndex((player) => player.socketId === socket.id);

                    // Should not happen but if it does we shouldn't proceed...
                    if (playerIdx < 0) {
                        return;
                    }

                    players.splice(playerIdx, 1);

                    // update mongo with new player list and send out update about players
                    const updatedLobby = await Lobby.findOneAndUpdate(
                        {_id: socket.lobby._id},
                        {$set: {'players': players}},
                        {new: true}
                    );

                    // notify all other clients that a new player has joined the lobby...
                    socket.broadcast.emit(events.NEW_PLAYER, {
                        lobby: {
                            players: await lobbyUtils.buildPlayerList(updatedLobby),
                            owner: socket.lobby.name,
                        }
                    });
                }

            }
        });

        //connection is up, let's add a simple simple event
        socket.on(events.JOIN_GAME, async () => {
            const lobby = await Lobby.findOne({pin: socket.lobby.pin});
            socket.lobby = lobby;

            // update the players object for the game with the socket id
            const players = lobby.players;
            const idx = players.findIndex((player) => player.name === socket.decoded.name);

            // Couldn't find the player by name...
            if (idx < 0) {
                socket.emit("close", {"reason": "Invalid session."});
                return socket.disconnect();
            }

            // set socket id and set the player as 'confirmed' for the lobby.
            players[idx] = {name: players[idx].name, _id: players[idx]._id, socketId: socket.id, confirmed: true};

            await Lobby.updateOne(
                {_id: lobby._id},
                {$set: {'players': players}}
            );

            // check that the status of the lobby is on status 'WAITING'. If the game has
            // started, return a 'Lobby full' error code.
            if (lobby.status !== game.GameState.WAITING) {
                return socket.emit(events.ERROR, {status: false, type: "lobby_full", message: error.LOBBY_FULL});
            }

            const playerList = await lobbyUtils.buildPlayerList(lobby);
            const owner = await Player.findOne({_id: lobby.owner});

            // oops, was the owner account deleted
            if (!owner) {
                return socket.emit(events.ERROR, {
                    status: false,
                    type: "internal_server_error",
                    message: error.INTERNAL_SERVER_ERROR
                });
            }

            // send a private message to the socket with the required information
            socket.emit(events.JOINED_GAME, {
                isHost: socket.isAdmin,
                lobby: {
                    ...(socket.isAdmin && {passphrase: lobby.passphrase}),
                    status: lobby.status,
                    players: playerList,
                    owner: owner.name,
                }
            })

            // notify all other clients that a new player has joined the lobby...
            socket.broadcast.emit(events.NEW_PLAYER, {
                lobby: {
                    players: playerList,
                    owner: owner.name,
                }
            });
        });


        // TODO: this should be ideally server side... Could be done with CRON
        //      jobs but im not sure if that is also a suitable solution.
        socket.on(events.UPDATE_PASSPHRASE, async (message) => {
            if (!socket.isAdmin) socket.emit(events.ERROR, new Error(error.UNAUTHORIZED));

            // update the passphrase in the MongoDB with the one the client said
            try {
                await Lobby.updateOne({_id: socket.lobby._id}, {passphrase: message.passphrase});

                // @cleanup: this might be redundant since the server will return an error if it doesn't
                // manage to update the passphrase.
                socket.emit(events.UPDATED_PASSPHRASE, {passphrase: message.passphrase});
            } catch (e) {
                console.log(e)
                socket.emit(events.ERROR, new Error(error.INTERNAL_SERVER_ERROR));
            }
        });


        // Handler method for the game starting event.
        socket.on(events.START_GAME, async () => {
            if (!socket.isAdmin) socket.emit(events.ERROR, new Error(error.UNAUTHORIZED));

            const lobby = await Lobby.findOne({pin: socket.lobby.pin});

            // check that there are at least 2 players in the lobby
            if (lobby.players.length < 2) {
                socket.emit(events.ERROR, new Error(error.BAD_REQUEST));
            }

            // update the game state to 'STARTED' since the game has started
            // await Lobby.updateOne({_id: socket.lobby._id}, {status: game.GameState.STARTED});

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

            // iterate over each socket id in the 'namespace' that is connected and send them
            // the cards...
            Game.players.forEach(((value, key) => {
                const socketId = lobby.players.find(p => p.name === key).socketId;

                // send each player their cards, round metadata, etc...
                io.of(lobby.pin.toString()).sockets.get(socketId).emit("begin_round", {
                    cards: value,
                    trumpSuit: Game.trumpSuit,
                    deckSize: Game.deck.length
                });
            }));

            // await Lobby.updateOne({_id: socket.lobby._id}, {status: game.GameState.PLAYING});
        });

        socket.on(events.KICK_PLAYER, async (message) => {
            if (!socket.isAdmin) socket.emit(events.ERROR, new Error(error.UNAUTHORIZED));

            const lobby = await Lobby.findOne({pin: socket.lobby.pin});

            // check that we're currently waiting for players as the admin
            // cannot kick players once the game has started.
            if (lobby.status !== game.GameState.WAITING) {
                return socket.emit(events.ERROR, {
                    "status": false,
                    "type": "bad_request",
                    message: "can't kick player when playing."
                });
            }

            // check that the player 'name' is present in the current lobby
            const players = lobby.players;
            const index = players.findIndex((player) => player.name === message.name);


            if (index < 0) {
                return socket.emit(events.ERROR, {"status": false, "type": "bad_request", message: "Invalid player."});
            }

            // otherwise disconnect the socket from the current namespace.
            const kickedPlayerSocket = io.of(lobby.pin).sockets.get(players[index].socketId);

            if (typeof kickedPlayerSocket === 'undefined') {
                players.splice(index, 1);

                // update mongo with new player list and send out update about players
                const updatedLobby = await Lobby.findOneAndUpdate(
                    {_id: lobby._id},
                    {$set: {players}},
                    {new: true}
                );

                // notify all other clients that a new player has joined the lobby...
                return socket.broadcast.emit(events.NEW_PLAYER, {
                    lobby: {
                        players: await lobbyUtils.buildPlayerList(updatedLobby),
                        owner: lobby.name,
                    }
                });
            } else {
                kickedPlayerSocket.emit("close", {"reason": "kicked", "extra": "sorry."});
                kickedPlayerSocket.disconnect();
            }
        });


        // TODO: implement
        socket.on(events.TURN, async (message) => {
        });


        // TODO: implement
        socket.on(events.NEXT_ROUND, async (message) => {

        });
    });
}
