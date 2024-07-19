import { PopulatedGame } from "../models/game.model";
import { TokenPayload } from "../schemas/auth";
import { Logger } from "winston";


export type SocketQuery = {
    token?: string,
    refreshToken?: string,
}

declare module "socket.io" {
    export interface Socket {
        logger: Logger,
        lobby: PopulatedGame;
        decoded: TokenPayload | undefined,
        isAdmin: boolean,
        isUser: boolean,
    }
}
