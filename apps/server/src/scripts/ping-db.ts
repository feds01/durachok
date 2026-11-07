/**
 * Check that the server can reach MongoDB at its configured `MONGODB_URI`, as
 * `just db` does. Waits up to the given number of milliseconds (default 2000).
 *
 * Exits with 0 when MongoDB answers, 1 when a local MongoDB doesn't (so
 * `just db` can start one), and 2 when a remote one doesn't.
 */
import mongoose from "mongoose";

import { MONGO_URI } from "../config";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The URI without its credentials, to print. */
const shown = MONGO_URI.replace(/\/\/[^@/]*@/, "//***@");

const isLocal = (() => {
    try {
        return LOCAL_HOSTS.has(new URL(MONGO_URI).hostname);
    } catch {
        return false;
    }
})();

const timeout = Number(process.argv[2] ?? 2000);
const connection = mongoose.createConnection(MONGO_URI, { serverSelectionTimeoutMS: timeout });

try {
    await connection.asPromise();
    await connection.db?.admin().ping();
    console.log(`MongoDB is up at ${shown}`);
    process.exitCode = 0;
} catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    if (isLocal) {
        console.log(`MongoDB isn't running at ${shown}`);
        process.exitCode = 1;
    } else {
        console.error(`error: can't reach MongoDB at ${shown}: ${reason}`);
        console.error("Check MONGODB_URI in apps/server/.env, or remove it to use a local MongoDB.");
        process.exitCode = 2;
    }
} finally {
    await connection.close();
}
