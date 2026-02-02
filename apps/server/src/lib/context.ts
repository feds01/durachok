import { Lobby } from "@durachok/transport";
import { Logger } from "pino";

import { IMAGE_STORAGE } from "../config";
import { AuthService } from "../controllers/auth";
import { CommonService } from "../controllers/common";
import { GameService } from "../controllers/game";
import { ImageService } from "../controllers/image";
import { LobbyService } from "../controllers/lobby";
import { UserService } from "../controllers/user";
import { LocalImageRepo, S3ImageRepo } from "../repos/image";
import { expr } from "../utils";

/**
 * Initialise the global context for the socket server, this is exactly
 * the same mechanism that is used for the tRPC server context.
 *
 * @param logger - The logger instance.
 * @param hostname - The hostname of the server.
 * @returns
 */
export const createContext = (logger: Logger, hostname: string = "") => {
    const imageRepo = expr(() => {
        if (IMAGE_STORAGE === "s3") {
            return new S3ImageRepo(logger);
        }

        const hostInfo = { hostname };
        return new LocalImageRepo(hostInfo, logger);
    });
    const authService = new AuthService(logger);
    const commonService = new CommonService(logger);
    const imageService = new ImageService(logger, imageRepo);
    const lobbyService = new LobbyService(logger, commonService, imageService);
    const userService = new UserService(logger, commonService, authService, imageService, lobbyService);
    const gameService = (lobby: Lobby) => new GameService(lobby, logger, commonService);

    return {
        logger,
        authService,
        lobbyService,
        imageService,
        userService,
        gameService,
    };
};

/** The actual type of the server context. */
export type Context = ReturnType<typeof createContext>;
