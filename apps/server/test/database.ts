/**
 * The MongoDB that the server's tests use: at `TEST_MONGODB_URI`, or on localhost (`just db`).
 * Each test file uses a database of its own, which it drops afterwards.
 */
import mongoose from "mongoose";

/** Where MongoDB is. */
export const MONGO = process.env.TEST_MONGODB_URI ?? "mongodb://localhost:27017";

/** A database of a test file's own, which it drops when it's done, @see dropDatabase. */
export function testDatabaseUri(): string {
    return `${MONGO}/durachok-test-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Whether MongoDB answers. CI must have it, so waits for it to start there. It must be a
 * replica set, since the server changes lobbies in transactions.
 */
async function mongoAvailable(): Promise<boolean> {
    let connection: mongoose.Connection;
    try {
        connection = await mongoose
            .createConnection(MONGO, { serverSelectionTimeoutMS: process.env.CI ? 30_000 : 1000 })
            .asPromise();
    } catch {
        return false;
    }

    try {
        const hello = await connection.db?.admin().command({ hello: 1 });
        if (!hello?.setName) {
            throw new Error(`MongoDB at ${MONGO} isn't a replica set, which the server needs. Run \`just db\`.`);
        }
        return true;
    } finally {
        await connection.close();
    }
}

/** Whether the tests that need MongoDB can run, which they must in CI. */
export const available = await mongoAvailable();
if (!available && process.env.CI) {
    throw new Error(`MongoDB isn't reachable at ${MONGO}.`);
}

/** Drop a test file's database, @see testDatabaseUri. */
export async function dropDatabase(uri: string): Promise<void> {
    const connection = await mongoose.createConnection(uri).asPromise();
    await connection.dropDatabase();
    await connection.close();
}
