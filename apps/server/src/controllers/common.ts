import { TRPCError } from "@trpc/server";
import { Logger } from "pino";

import Games, { GameDocument } from "../models/game.model";
import Lobbies, { PopulatedLobbyDocument, PopulatedLobbyFields } from "../models/lobby.model";
import User, { UserDocument } from "../models/user.model";
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
        super({ code: "BAD_REQUEST", message: "Player isn't in the lobby" });
    }
}

/** Error to be thrown when a player joins a lobby that already has a player with their name or account. */
export class PlayerAlreadyInLobbyError extends TRPCError {
    public constructor() {
        super({ code: "BAD_REQUEST", message: "User already in lobby" });
    }
}

/** Error to be thrown when a player tries to join a lobby that has no free place. */
export class LobbyFullError extends TRPCError {
    public constructor() {
        super({ code: "BAD_REQUEST", message: "Lobby is full" });
    }
}

/** Error to be thrown when an action needs the lobby to be in another state, e.g. waiting. */
export class InvalidLobbyStateError extends TRPCError {
    public constructor(message: string) {
        super({ code: "BAD_REQUEST", message });
    }
}

export class InvalidLobbySettingsError extends TRPCError {
    public constructor(message: string) {
        super({ code: "BAD_REQUEST", message });
    }
}

/** Error to be thrown when a player whom the owner kicked out of a lobby tries to join it again. */
export class KickedFromLobbyError extends TRPCError {
    public constructor() {
        super({ code: "FORBIDDEN", message: "The owner of this lobby kicked you out of it" });
    }
}

/** Error to be thrown when a user who keeps as many lobbies as they may tries to make another. */
export class TooManyLobbiesError extends TRPCError {
    public constructor(limit: number) {
        super({ code: "BAD_REQUEST", message: `You can keep ${limit} lobbies at once, delete one to make another` });
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
    public async getUserDbObject(userId: string): Promise<UserDocument> {
        const user = await User.findById(userId);

        if (!isDef(user)) {
            throw new UserNotFoundError();
        }

        return user;
    }

    /** Find a lobby by `PIN` and return the underling DB object. */
    public async getLobbyDbObject(pin: string): Promise<PopulatedLobbyDocument> {
        const lobby = await Lobbies.findOne({ pin }).populate<Pick<PopulatedLobbyFields, "owner">>("owner");

        if (!isDef(lobby)) {
            throw new LobbyNotFoundError();
        }

        return lobby;
    }

    /** Find a lobby by `PIN` and return the underling DB object. */
    public async getGameDbObject(pin: string): Promise<GameDocument> {
        const doc = await Lobbies.findOne({ pin }).select("game");
        if (!isDef(doc)) {
            throw new Error("Lobby not found");
        }

        const parsedDoc = await DBGameSelectionSchema.safeParseAsync(doc.toObject());

        if (!parsedDoc.success) {
            this.logger.error("Failed to parse game selection:\n" + parsedDoc.error);
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const game = await Games.findById(parsedDoc.data.game);
        if (!isDef(game)) {
            throw new GameNotFound();
        }

        return game;
    }
}
