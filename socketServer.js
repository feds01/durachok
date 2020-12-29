import {Server} from "socket.io";
import jwt from "jsonwebtoken";
import Lobby from "./src/models/game";
import {error, events, game} from "shared";
import Player from "./src/models/user";
import * as lobbyUtils from "./src/utils/lobby";


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
                if (err) return next(new Error(error.AUTHENTICATION_FAILED));

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
        //connection is up, let's add a simple simple event
        socket.on(events.JOIN_GAME, async (message) => {

            // check that the status of the lobby is on status 'WAITING'. If the game has
            // started, return a 'Lobby full' error code.
            if (socket.lobby.status !== game.GameState.WAITING || socket.lobby.players.length === socket.lobby.maxPlayers) {
                socket.emit(events.ERROR, new Error(error.LOBBY_FULL));
            }

            const playerList = await lobbyUtils.buildPlayerList(socket.lobby);
            const owner = await Player.findOne({_id: socket.lobby.owner});

            // oops, was the owner account deleted
            if (!owner) {
                socket.emit(events.ERROR, error.INTERNAL_SERVER_ERROR);
            }

            // send a private message to the socket with the required information
            socket.emit(events.JOINED_GAME, {
                isHost: socket.isAdmin,
                lobby: {
                    ...(socket.isAdmin && {passphrase: socket.lobby.passphrase}),
                    status: socket.lobby.status,
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
                socket.emit(events.UPDATE_PASSPHRASED, {passphrase: message.passphrase});
            } catch (e) {
                console.log(e)
                socket.emit(events.ERROR, new Error(error.INTERNAL_SERVER_ERROR));
            }
        });


        // Handler method for the game starting event.
        socket.on(events.START_GAME, async (message) => {
            if (!socket.isAdmin) socket.emit(events.ERROR, new Error(error.UNAUTHORIZED));

            // check that there are at least 2 players in the lobby
            if (socket.lobby.players.length < 2) {
                socket.emit(events.ERROR, new Error(error.BAD_REQUEST));
            }

            // update the game state to 'STARTED' since the game has started
            await Lobby.updateOne({_id: socket.lobby._id}, {status: game.GameState.STARTED});

            // fire countdown event
            io.of(socket.lobby.pin.toString()).emit(events.COUNTDOWN);

            // TODO: add mechanism to wait for all clients to confirm that they have finished
            //       counting down and are ready to begin the game...
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec wait

            // fire game_started event and update the game state to 'PLAYING'
            io.of(socket.lobby.pin.toString()).emit(events.GAME_STARTED);

            await Lobby.updateOne({_id: socket.lobby._id}, {status: game.GameState.PLAYING});
        });


        // TODO: implement
        socket.on(events.TURN, async (message) => {
        });


        // TODO: implement
        socket.on(events.NEXT_ROUND, async (message) => {

        });
    });
}
