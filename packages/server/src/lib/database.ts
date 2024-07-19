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
