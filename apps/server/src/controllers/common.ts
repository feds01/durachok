import Lobbies, { PopulatedGame } from "../models/game.model";
import User, { IUser } from "../models/user.model";
import { isDef } from "../utils";

/**
 * A service used to access common functionality and information
 * about data objects stored within the DB.
 */
export class CommonService {
    public constructor() {}

    /** Find a user by `ID` and return the underling DB object. */
    public async getUserDbObject(userId: string): Promise<IUser> {
        const user = await User.findById(userId);

        if (!isDef(user)) {
            throw new Error("User not found");
        }

        return user;
    }

    /** Find a lobby by `PIN` and return the underling DB object. */
    public async getLobbyDbObject(pin: string): Promise<PopulatedGame> {
        const game = await Lobbies.findOne({ pin }).populate<
            Pick<PopulatedGame, "owner">
        >("owner");

        if (!isDef(game)) {
            throw new Error("Game not found");
        }

        return game;
    }
}
