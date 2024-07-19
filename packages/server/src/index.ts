import cors from 'cors';
import chalk from 'chalk';
import helmet from "helmet";
import express from 'express';
import { AddressInfo } from "net";
import { createServer } from 'http';
import { renderTrpcPanel } from "trpc-panel";
import { createExpressMiddleware } from '@trpc/server/adapters/express';

import logger from "./lib/logger";
import { ENV, PORT } from './config';
import { connectDB } from './lib/database';
import { createContext } from './lib/trpc';
import { appRouter } from './routes';
import { expr } from './utils';

const app = express();

// Various Express middleware.

app.use(helmet({ contentSecurityPolicy: (ENV === 'production') ? undefined : false }));
app.use(express.json({ limit: "2mb" }));
app.use(cors());
app.use(express.urlencoded({ extended: false }));

// tRPC endpoints

app.use(
    '/api/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext
    }),
)

if (ENV === "dev") {
    app.use("/playground", (_, res) => {
        return res.send(
            renderTrpcPanel(appRouter, { url: `http://localhost:${PORT}/api/trpc` })
        );
    });
}



// catch 404 and forward to error handler
app.use((req, res, next) => {
    res.status(404).send({
        status: false
    });
});

//initialize a simple http server
const server = createServer(app);

//start our server
server.listen(PORT, async () => {
    await connectDB();

    const info = server.address() as AddressInfo;
    const bold = chalk.bold;
    const env = expr(() => {
        if (ENV === 'dev') {
            return chalk.bgBlue.bold(ENV);
        }
        return chalk.bgRed.bold(ENV);
    });
    const port = chalk.bgBlue.bold(info.port);

    logger.info(`
        .------..------..------..------..------..------..------..------.
        |D.--. ||U.--. ||R.--. ||A.--. ||C.--. ||H.--. ||O.--. ||K.--. |
        | :/\\: || (\\/) || :(): || (\\/) || :/\\: || :/\\: || :/\\: || :/\\: |
        | (__) || :\\/: || ()() || :\\/: || :\\/: || (__) || :\\/: || :\\/: |
        | '--'D|| '--'U|| '--'R|| '--'A|| '--'C|| '--'H|| '--'O|| '--'K|
        \`------'\`------'\`------'\`------'\`------'\`------'\`------'\`------'        
        ${bold('env')}: ${env} 
        ${bold('port')}:${port}
    `);

});
