import {IGame} from "../models/game";
import {AnonymousUserTokenPayload, RegisteredUserTokenPayload} from "./auth";


export type SocketQuery = {
    token?: string,
    refreshToken?: string,
}

declare module "socket.io" {
    export interface Socket {
        lobby: IGame;
        decoded: RegisteredUserTokenPayload | AnonymousUserTokenPayload,
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