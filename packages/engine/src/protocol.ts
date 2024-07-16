/**
 * Possible move types that any player can make.
 * */
export enum MoveTypes {
    PLACE = "place",
    COVER = "cover",
    FORFEIT = "forfeit",
}


export enum GameStatus {
    WAITING = "waiting",
    STARTED = "started",
    PLAYING = "playing",
}

export enum ServerEvents {
    JOIN_GAME = "join_game",
    SURRENDER = "surrender",
    UPDATE_PASSPHRASE = "update_passphrase",
    START_GAME = "start_game",
    KICK_PLAYER = "kick_player",
    MOVE = "move",
    MESSAGE = "broadcast_message",
}

export enum ClientEvents {
    MESSAGE = "send_message",
    JOINED_GAME = "join_game",
    NEW_PLAYER = "new_player",
    COUNTDOWN = "countdown",
    GAME_STARTED = "game_started",
    BEGIN_ROUND = "begin_round",
    SPECTATOR_STATE="spectator_state",
    ACTION = "action",
    VICTORY = "victory",

    // @redundant event.
    UPDATED_PASSPHRASE = "updated_passphrase",

    // Event signifying that an error occurred on the server side.
    ERROR = "error",
    INVALID_MOVE = "invalid_move",
    STALE_GAME = "stale_game",

    // Event signifying that a connection is to be forcefully closed between client and
    // server instances.
    CLOSE = "close",
}

export type Event = ServerEvents | ClientEvents;
