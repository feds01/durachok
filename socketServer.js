//initialize the WebSocket server instance
import {Server} from "socket.io";
import Lobby from "./api/models/game";
import * as error from "./api/error";
import jwt from "jsonwebtoken";
import Player from "./api/models/user";
import * as lobbyUtils from "./api/utils/lobby";
import {GameState} from "./api/common/game";


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

    lobbies.on('connect', (socket, next) => {
        //connection is up, let's add a simple simple event
        socket.on('join_game', async (message) => {

            // check that the status of the lobby is on status 'WAITING'. If the game has
            // started, return a 'Lobby full' error code.
            if (socket.lobby.status !== GameState.WAITING || socket.lobby.players.length === socket.lobby.maxPlayers) {
                next(new Error(error.LOBBY_FULL));
            }

            const playerList = await lobbyUtils.buildPlayerList(socket.lobby);
            const owner = await Player.findOne({_id: socket.lobby.owner});

            // oops, was the owner account deleted
            if (!owner) {
                socket.emit("error", error.INTERNAL_SERVER_ERROR);
            }

            // send a private message to the socket with the required information
            socket.emit("joined_game", {
                isHost: socket.isAdmin,
                lobby: {
                    ...(socket.isAdmin && {passphrase: socket.lobby.passphrase}),
                    players: playerList,
                    owner: owner.name,
                }
            })

            // notify all other clients that a new player has joined the lobby...
            socket.broadcast.emit("new_player", {
                lobby: {
                    players: playerList,
                    owner: owner.name,
                }
            });
        });

        // TODO: this should be ideally server side... Could be done with CRON
        //      jobs but im not sure if that is also a suitable solution.
        socket.on('update_passphrase', async (message) => {
            if (!socket.isAdmin) return next(new Error(error.UNAUTHORIZED));

            // update the passphrase in the MongoDB with the one the client said
            try {
                await Lobby.updateOne({_id: socket.lobby._id}, {passphrase: message.passphrase});

                // @cleanup: this might be redundant since the server will return an error if it doesn't
                // manage to update the passphrase.
                socket.emit("updated_passphrase", {passphrase: message.passphrase});
            } catch (e) {
                console.log(e)
                next(new Error(error.INTERNAL_SERVER_ERROR));
            }
        });

        socket.on("start_game", async (message) => {
            if (!socket.isAdmin) return next(new Error(error.UNAUTHORIZED));


        });

        socket.on("turn", async (message) => {

        });
    });
}
