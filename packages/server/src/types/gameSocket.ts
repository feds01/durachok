import {IGame, PopulatedGame} from "../models/game";
import {AnonymousUserTokenPayload, RegisteredUserTokenPayload} from "./auth";
import {Logger} from "winston";


export type SocketQuery = {
    token?: string,
    refreshToken?: string,
}

declare module "socket.io" {
    export interface Socket {
        logger: Logger,
        lobby: PopulatedGame;
        decoded: RegisteredUserTokenPayload | AnonymousUserTokenPayload | undefined,
        isAdmin: boolean,
        isUser: boolean,
    }

    // export interface Handshake {
    //     query: {
    //         token?: string,
    //         refreshToken?: string,
    //     }
    // }
}
