// Import our environment variables
import {Game, ServerEvents} from "shared";

require('dotenv').config();

import cors from 'cors';
import logger from 'morgan';
import express from 'express';
import helmet from "helmet";
import mongoose from 'mongoose';
import {createServer} from 'http';

import userRouter from './routes/user';
import lobbyRouter from './routes/lobby';
import {makeSocketServer} from "./socket";

const app = express();

// Use helmet
app.use(helmet());

// Logging
app.use(logger(process.env.NODE_ENV || 'dev'));

// Parse JSON body request
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

//initialize a simple http server
const server = createServer(app);

//start our server
server.listen(process.env.PORT || 5000, () => {
    console.log(`Server started on ${server.address()}! Mode=${process.env.NODE_ENV || "dev"}`);

    console.log('Attempting connection with MongoDB cluster...')
    mongoose.connect(process.env.MONGODB_CONNECTION_URI!, {
        connectTimeoutMS: 30000,
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    }, (err) => {
        if (err) throw err;

        console.log('Established connection with MongoDB service.')
    });

    //initialize the WebSocket server instance
    makeSocketServer(server);
});
