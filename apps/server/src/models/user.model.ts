import mongoose, { HydratedDocument, Schema } from "mongoose";

import { STATISTIC_NAMES, StoredStatistics } from "../lib/statistics";

export interface IUser {
    email: string;
    name: string;
    password: string;
    image: boolean;
    createdAt: Date;
    statistics: StoredStatistics;
}

export type UserDocument = HydratedDocument<IUser>;

const UserSchema = new Schema<IUser>({
    image: { type: Boolean, required: false, default: false },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: false, unique: true },
    password: { type: String, required: true, minLength: 12 },
    // What they've done in the games that they finished, which a game adds to as it ends.
    statistics: Object.fromEntries(STATISTIC_NAMES.map((name) => [name, { type: Number, required: true, default: 0 }])),
    createdAt: { type: Date, required: false, default: Date.now },
});

export default mongoose.model<IUser>("user", UserSchema);
