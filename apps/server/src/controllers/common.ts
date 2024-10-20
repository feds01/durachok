import { TRPCError } from "@trpc/server";
import { Logger } from "pino";

import Games, { IGame } from "../models/game.model";
import Lobbies, { PopulatedLobby } from "../models/lobby.model";
import User, { IUser } from "../models/user.model";
import { DBGameSelectionSchema } from "../schemas/game";
import { isDef } from "../utils";

/** An exception that indicates that a game could not be found. */
export class GameNotFound extends TRPCError {
    public constructor() {
        super({
            code: "NOT_FOUND",
            message: "Game not found",
        });
    }
}

/** Error to be thrown when a lobby is not found. */
export class LobbyNotFoundError extends TRPCError {
    public constructor() {
        super({ code: "NOT_FOUND" });
    }
}

export class PlayerNotInLobbyError extends TRPCError {
    public constructor() {
        super({ code: "BAD_REQUEST" });
    }
}

export class InvalidLobbySettingsError extends TRPCError {
    public constructor(message: string) {
        super({ code: "BAD_REQUEST", message });
    }
}

/** Error to be thrown when a user is not found. */
export class UserNotFoundError extends TRPCError {
    public constructor() {
        super({ code: "NOT_FOUND" });
    }
}

/**
 * A service used to access common functionality and information
 * about data objects stored within the DB.
 */
export class CommonService {
    public constructor(private readonly logger: Logger) {}

    /** Find a user by `ID` and return the underling DB object. */
    public async getUserDbObject(userId: string): Promise<IUser> {
        const user = await User.findById(userId);

        if (!isDef(user)) {
            throw new UserNotFoundError();
        }

        return user;
    }

    /** Find a lobby by `PIN` and return the underling DB object. */
    public async getLobbyDbObject(pin: string): Promise<PopulatedLobby> {
        const lobby = await Lobbies.findOne({ pin }).populate<
            Pick<PopulatedLobby, "owner">
        >("owner");

        if (!isDef(lobby)) {
            throw new LobbyNotFoundError();
        }

        return lobby;
    }

    /** Find a lobby by `PIN` and return the underling DB object. */
    public async getGameDbObject(pin: string): Promise<IGame> {
        const doc = await Lobbies.findOne({ pin }).select("game");
        if (!isDef(doc)) {
            throw new Error("Lobby not found");
        }

        const parsedDoc = await DBGameSelectionSchema.safeParseAsync(
            doc.toObject(),
        );

        if (!parsedDoc.success) {
            this.logger.error(
                "Failed to parse game selection:\n" + parsedDoc.error,
            );
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const game = await Games.findById(parsedDoc.data.game);
        if (!isDef(game)) {
            throw new GameNotFound();
        }

        return game;
    }
}
