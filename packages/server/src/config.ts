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

/** AWS configurations */
export const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || "";
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
export const AWS_REGION = process.env.AWS_REGION || "";
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";
