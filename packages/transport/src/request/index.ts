import { GameSettings, GameSettingsSchema } from "./game";
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
} from "./lobby";
import {
    UserAuthResponseSchema,
    UserLogin,
    UserLoginSchema,
    UserRegistrationSchema,
    UserUpdate,
    UserUpdateSchema,
} from "./user";

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
    UserRegistrationSchema,
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

export * from "./socket";
