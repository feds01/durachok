// Import our environment variables
import {Game, generateCardDeck, shuffleDeck} from "./api/common/game";

require('dotenv').config();

import cors from 'cors';
import logger from 'morgan';
import * as http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import * as WebSocket from 'ws';
import createError from 'http-errors';

import userRouter from './api/routes/user';
import lobbyRouter from './api/routes/lobby';

const app = express();
app.set('view engine', 'ejs');

app.use(logger(process.env.NODE_ENV || 'dev'));
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: false }));

// Add our routes to the root router
app.use('/api/user', userRouter);
app.use('/api/lobby', lobbyRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});



//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({server});

wss.on('connection', (ws) => {

    //connection is up, let's add a simple simple event
    ws.on('message', (message) => {

        //log the received message and send it back to the client
        console.log('received: %s', message);
        ws.send(`Hello, you sent -> ${message}`);
    });

    //send immediately a feedback to the incoming connection
    ws.send('Hi there, I am a WebSocket server');
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
