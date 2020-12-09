// Import our environment variables
import jwt from "jsonwebtoken";

require('dotenv').config();

import cors from 'cors';
import logger from 'morgan';
import express from 'express';
import mongoose from 'mongoose';
import {Server} from "socket.io";
import {createServer} from 'http';
import * as error from "./api/error";
import Lobby from './api/models/game';
import Player from "./api/models/user";
import {Game} from "./api/common/game";

import userRouter from './api/routes/user';
import lobbyRouter from './api/routes/lobby';
import lobby from "./api/routes/lobby";

const app = express();
app.set('view engine', 'ejs');

app.use(logger(process.env.NODE_ENV || 'dev'));
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({extended: false}));

// Add our routes to the root router
app.use('/api/user', userRouter);
app.use('/api/lobby', lobbyRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    res.status(404).send({
        status: false
    });
});

// error handler
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500).json({
        status: false
    })
});


//initialize a simple http server
const server = createServer(app);

//initialize the WebSocket server instance
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
        jwt.verify(socket.handshake.query.token, process.env.JWT_SECRET_KEY, (err, decoded) => {
            if (err) return next(new Error(error.AUTHENTICATION_FAILED));

            // check that the nsp matched the pin or the user of the Durachok
            // service is the owner of this lobby.
            const isAdmin = typeof decoded.id !== "undefined";

            if (isAdmin) {
                const user = Player.findOne({_id: decoded.id});

                // This shouldn't happen unless the user was deleted and the token is stale.
                if (!user) {
                    return next(new Error(error.AUTHENTICATION_FAILED));
                }

                // check that id of the owner is equal to the id in the JWT
                if (user._id !== socket.lobby.owner._id) {
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
    socket.on('join_game', (message) => {

        //log the received message and send it back to the client
        console.log('received: %s', message);
        io.of(socket.nsp.name).emit("joined_game", {players: socket.lobby.players.map(p => p.name)});
    });
});


//start our server
server.listen(process.env.PORT || 5000, () => {
    console.log(`Server started on port ${server.address().port}!`);

    console.log('Attempting connection with MongoDB cluster...')
    mongoose.connect(process.env.MONGODB_CONNECTION_URI, {useNewUrlParser: true, useUnifiedTopology: true}, (err) => {
        if (err) throw err;

        console.log('Established connection with MongoDB service.')
    });

    const game = new Game(12346, 8, {});
});
