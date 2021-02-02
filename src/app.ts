// Import our environment variables
require('dotenv').config();

import cors from 'cors';
import morgan from 'morgan';
import helmet from "helmet";
import express from 'express';
import mongoose from 'mongoose';
import {AddressInfo} from "net";
import {createServer} from 'http';
import logger from "./logFormatter";
import userRouter from './routes/user';
import lobbyRouter from './routes/lobby';
import {makeSocketServer} from "./socket";

const app = express();

// Use helmet
app.use(helmet());

if (process.env.NODE_ENV !== 'production') {
    // Logging for network requests
    app.use(morgan('dev'));
}

// Parse JSON body request
app.use(express.json({limit: "2mb"}));
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
    const port = (server.address() as AddressInfo).port;

    logger.info(`Server started on ${port}! Mode=${process.env.NODE_ENV || "dev"}`);
    logger.info("Attempting connection with MongoDB cluster...");

    mongoose.connect(process.env.MONGODB_CONNECTION_URI!, {
        connectTimeoutMS: 30000,
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    }, (err) => {
        if (err) {
            logger.error(`Failed to connect to MongoDB: ${err.message}`);
            process.exit(1);
        }

        logger.info('Established connection with MongoDB service');
    });

    //initialize the WebSocket server instance
    makeSocketServer(server);
});
