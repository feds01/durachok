import { config } from "dotenv";

config();

/** Database configurations */
export const MONGO_URI =
    process.env.MONGODB_CONNECTION_URI || "mongodb://localhost:27017/merndb";

/** JWT keys and configurations */
export const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "secret";

/** Networking configurations */
export const PORT = process.env.PORT || 5000;
export const ENV = process.env.NODE_ENV || "dev";
