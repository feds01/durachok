import { Locked } from "@3xpo/locked";
import mongoose from "mongoose";

import { MONGO_URI } from "../config";
import { expr } from "../utils";
import logger from "./logger";

export const connectDB = async () => {
    logger.info("Attempting connection with MongoDB service");
    mongoose.set("strictQuery", true);

    try {
        const { connection } = await mongoose.connect(MONGO_URI);

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
