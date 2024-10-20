import { GameSettings, GameSettingsSchema } from "@/request/game";
import {
    ByPinRequest,
    ByPinRequestSchema,
    GameCreateRequest,
    GameCreateRequestSchema,
    GameJoinRequest,
    GameJoinRequestSchema,
    LobbyInfo,
    LobbyInfoSchema,
    NameFreeInLobbyRequest,
    NameFreeInLobbyRequestSchema,
} from "@/request/lobby";
import {
    UserAuthResponseSchema,
    UserLogin,
    UserLoginSchema,
    UserUpdate,
    UserUpdateSchema,
} from "@/request/user";

export {
    ByPinRequestSchema,
    GameCreateRequestSchema,
    GameJoinRequestSchema,
    GameSettingsSchema,
    LobbyInfoSchema,
    NameFreeInLobbyRequestSchema,
    UserAuthResponseSchema,
    UserLoginSchema,
    UserUpdateSchema,
};

export type {
    ByPinRequest,
    GameCreateRequest,
    GameJoinRequest,
    GameSettings,
    LobbyInfo,
    NameFreeInLobbyRequest,
    UserLogin,
    UserUpdate,
};
