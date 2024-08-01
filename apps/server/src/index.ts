import { renderTrpcPanel } from "@metamorph/trpc-panel";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import chalk from "chalk";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import { AddressInfo } from "net";

import { APP_URL, ENV, IMAGE_STORAGE, PORT, UPLOAD_FOLDER } from "./config";
import { appRouter } from "./interface/routes";
import { connectDB } from "./lib/database";
import logger from "./lib/logger";
import { createContext } from "./lib/trpc";
import { expr } from "./utils";
import { connectSocket } from "./interface/socket";

const app = express();

// Various Express middleware.

app.use(
    helmet({ contentSecurityPolicy: ENV === "production" ? undefined : false }),
);
app.use(express.json({ limit: "2mb" }));
app.use((_, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
});
app.use(
    cors({
        origin: ["http://localhost:5173", "http://localhost:4173", APP_URL],
    }),
);
app.use(express.urlencoded({ extended: false }));

// tRPC endpoints

app.use(
    "/api/trpc",
    createExpressMiddleware({
        router: appRouter,
        createContext,
    }),
);

if (ENV === "dev") {
    app.use("/playground", (_, res) => {
        return res.send(
            renderTrpcPanel(appRouter, {
                url: `${APP_URL}/api/trpc`,
            }),
        );
    });
}

// For accessing uploaded images.
app.use("/uploads", express.static(UPLOAD_FOLDER));

// catch 404 and forward to error handler
app.use((_req, res) => {
    res.status(404).send({
        status: false,
    });
});


const server = createServer(app);

server.listen(PORT, async () => {
    await connectDB();
    await connectSocket(server);
    
    // Display the logo for the server.
    const info = server.address() as AddressInfo;
    const env = expr(() => {
        if (ENV === "dev") {
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
        ${chalk.bold("env")}: ${env} 
        ${chalk.bold("port")}:${port}
        ${chalk.bold("image")}: ${chalk.bgGreen.bold(IMAGE_STORAGE)}
    `);
});
