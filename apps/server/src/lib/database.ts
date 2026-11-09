import mongoose, { Query, Schema, UpdateQuery, isValidObjectId } from "mongoose";

import { MONGO_URI } from "../config";
import { expr, isDef } from "../utils";
import logger from "./logger";

/** Whether a MongoDB has transactions, which only a replica set or a sharded cluster does. */
export async function hasTransactions(connection: mongoose.Connection): Promise<boolean> {
    const hello = await connection.db?.admin().command({ hello: 1 });
    return isDef(hello?.setName) || hello?.msg === "isdbgrid";
}

/**
 * Connect to MongoDB with the settings that the queries rely on, without logging, e.g. for a
 * script that prints to stdout. The server connects with connectDB, which logs and checks that
 * MongoDB has transactions.
 */
export async function openDatabase(): Promise<mongoose.Connection> {
    mongoose.set("strictQuery", true);
    // The queries in a transaction take part in it without being handed its session.
    mongoose.set("transactionAsyncLocalStorage", true);

    const { connection } = await mongoose.connect(MONGO_URI);
    return connection;
}

/** Close the connection that openDatabase made. */
export async function closeDatabase(): Promise<void> {
    await mongoose.disconnect();
}

/** Whether a string is a document's id. A query by an `_id` that isn't one throws. */
export function isDocumentId(id: string): boolean {
    return isValidObjectId(id);
}

export const connectDB = async () => {
    logger.info("Attempting connection with MongoDB service");

    try {
        const connection = await openDatabase();

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

/** A document that counts its changes, @see versioning. */
export interface Versioned {
    /**
     * How many times the document has changed. Clients are sent it with each update, so
     * that they can leave out one that arrives after a newer one.
     */
    version: number;
}

/** A schema plugin that gives its documents a `version`, which every update adds one to. */
export function versioning(schema: Schema): void {
    schema.add({ version: { type: Number, required: true, default: 0 } });
    schema.pre(["updateOne", "findOneAndUpdate"], function (this: Query<unknown, Versioned>) {
        const update = (this.getUpdate() ?? {}) as UpdateQuery<Versioned>;
        this.setUpdate({ ...update, $inc: { ...update.$inc, version: 1 } });
    });
}
