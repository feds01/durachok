import { renderTrpcPanel } from "@metamorph/trpc-panel";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import chalk from "chalk";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import { AddressInfo } from "net";

import { APP_URL, ENV, IMAGE_STORAGE, PORT, TRUST_PROXY, UPLOAD_FOLDER, WEB_ORIGINS, secretProblems } from "./config";
import { appRouter } from "./interface/routes";
import { connectSocket } from "./interface/socket";
import { connectDB } from "./lib/database";
import logger from "./lib/logger";
import { createSessionContext } from "./lib/trpc";
import { expr } from "./utils";

// Tokens signed with a key that is missing, or shared, could be forged, so don't start without proper ones.
const problems = secretProblems();
if (problems.length > 0) {
    // Straight to stderr, since the logger writes from a worker, which exiting would cut off.
    process.stderr.write(
        `The server can't sign tokens safely, so it won't start: ${problems.join("; ")}. Set its keys in apps/server/.env.\n`,
    );
    process.exit(1);
}

const app = express();

// The rate limits count by the client's address, which the proxies in front of the server pass on.
app.set("trust proxy", TRUST_PROXY);

// Various Express middleware.

app.use(helmet({ contentSecurityPolicy: ENV === "production" ? undefined : false }));
app.use(express.json({ limit: "2mb" }));
app.use((_, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
});
app.use(
    cors({
        origin: WEB_ORIGINS,
    }),
);
app.use(express.urlencoded({ extended: false }));

// tRPC endpoints

app.use(
    "/api/trpc",
    createExpressMiddleware({
        router: appRouter,
        createContext: createSessionContext,
    }),
);

if (ENV === "dev") {
    app.get("/playground", (_, res) => {
        res.send(
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

// A failure in a background task shouldn't take the whole server down with it.
process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "unhandled promise rejection");
});

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
