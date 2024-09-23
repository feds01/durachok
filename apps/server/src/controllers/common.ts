import Games, { IGame } from "../models/game.model";
import Lobbies, { PopulatedLobby } from "../models/lobby.model";
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
    public async getLobbyDbObject(pin: string): Promise<PopulatedLobby> {
        const game = await Lobbies.findOne({ pin }).populate<
            Pick<PopulatedLobby, "owner">
        >("owner");

        if (!isDef(game)) {
            throw new Error("Lobby not found");
        }

        return game;
    }

    /** Find a lobby by `PIN` and return the underling DB object. */
    public async getGameDbObject(pin: string): Promise<IGame> {
        const doc = await Lobbies.findOne({ pin }).select("game");
        if (!isDef(doc)) {
            throw new Error("Lobby not found");
        }

        const game = await Games.findById(doc.game);
        if (!isDef(game)) {
            throw new Error("Game not found");
        }

        return game;
    }
}
