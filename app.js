// Import our environment variables
import jwt from "jsonwebtoken";

require('dotenv').config();

import cors from 'cors';
import logger from 'morgan';
import express from 'express';
import mongoose from 'mongoose';
import {createServer} from 'http';

import userRouter from './src/routes/user';
import lobbyRouter from './src/routes/lobby';
import {makeSocketServer} from "./src/socket";

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

//start our server
server.listen(process.env.PORT || 5000, () => {
    console.log(`Server started on port ${server.address().port}!`);

    console.log('Attempting connection with MongoDB cluster...')
    mongoose.connect(process.env.MONGODB_CONNECTION_URI, {
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
