import {IGame} from "../models/game";
import {AnonymousUserData, RegisteredUserData} from "../auth";


declare module "socket.io" {
    export interface Socket {
        lobby: IGame;
        decoded: RegisteredUserData | AnonymousUserData,
        isAdmin: boolean,
        isUser: boolean,
    }
}
