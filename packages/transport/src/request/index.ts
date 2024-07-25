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
