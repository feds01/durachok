import { Locked } from "@3xpo/locked";
import mongoose from "mongoose";

import { MONGO_URI } from "../config";
import { expr, isDef } from "../utils";
import logger from "./logger";

/** Whether a MongoDB has transactions, which only a replica set or a sharded cluster does. */
export async function hasTransactions(connection: mongoose.Connection): Promise<boolean> {
    const hello = await connection.db?.admin().command({ hello: 1 });
    return isDef(hello?.setName) || hello?.msg === "isdbgrid";
}

export const connectDB = async () => {
    logger.info("Attempting connection with MongoDB service");
    mongoose.set("strictQuery", true);
    // The queries in a transaction take part in it without being handed its session.
    mongoose.set("transactionAsyncLocalStorage", true);

    try {
        const { connection } = await mongoose.connect(MONGO_URI);

        if (!(await hasTransactions(connection))) {
            logger.error("MongoDB isn't a replica set, which the server needs for transactions. Run `just db`.");
            process.exit(1);
        }

        logger.info(`Established connection with ${connection.name} MongoDB`);
    } catch (error: unknown) {
        const message = expr(() => {
            if (error instanceof Error) {
                return error.message;
            }

            return String(error);
        });
        logger.error(`Failed to connect to MongoDB: ${message}`);
        process.exit(1);
    }
};

/**
 * Run a function in a transaction, which every query in it takes part in. When another
 * change gets to the same document first, the transaction is undone, and the function
 * runs again, on the documents as they are then. So a change that reads a document and
 * then writes it never acts on one that is out of date, whichever server makes it.
 */
export const transaction = <T>(func: () => Promise<T>): Promise<T> => mongoose.connection.transaction(func);

/**
 * A in-memory lock system to ensure that certain events can be synced
 * across multiple instances of requests. This is useful for ensuring that
 * certain game actions can be synchronised across the entire app.
 *
 * N.B. This lock should only be acquired when absolutely necessary, and when
 * there is a possibility of multiple requests being made at the same time.
 */
const LOCK = new Locked();

/**
 * Run a function with a lock on a given key.
 *
 * @param key The key to lock.
 * @param func The function to run.
 */
export const withLock = async <T>(key: string, func: () => Promise<T>): Promise<T> => {
    const unlock = await LOCK.lock(key);

    try {
        return await func();
    } finally {
        unlock();
    }
};
