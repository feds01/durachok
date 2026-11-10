import {
    Action,
    JoinMessage,
    Lobby,
    Message,
    PlayerGameState,
    PlayerMove,
    SpectatorGameState,
    VictoryMessage,
    isSameMessage,
} from "@durachok/transport";

/** Why this client is no longer in the lobby. */
export type CloseReason =
    /** The owner removed the player. */
    | "kicked"
    /** The owner deleted the lobby. */
    | "lobby_closed"
    /** The player's place in the lobby is gone, e.g. it was freed when they disconnected. */
    | "stale_token"
    /** The server refused the player's tokens. */
    | "unauthorized"
    /** The connection dropped, and the socket gave up on it. */
    | "disconnected"
    /** The player left. */
    | "left";

/** The reasons with which the server closes a lobby for a client. */
const SERVER_CLOSE_REASONS: ReadonlySet<string> = new Set<CloseReason>(["kicked", "lobby_closed", "stale_token"]);

function isServerCloseReason(reason: string): reason is CloseReason {
    return SERVER_CLOSE_REASONS.has(reason);
}

/** Where this client's connection to the lobby is. */
export type LobbyConnection =
    /** The client is trying to connect, and the socket is retrying. */
    | { kind: "connecting" }
    /** The client is connected, and the server accepted its tokens. */
    | { kind: "joined" }
    /** The connection dropped while in the lobby, and the socket is reconnecting. */
    | { kind: "reconnecting" }
    /** The connection was closed. */
    | { kind: "closed"; reason: CloseReason };

export interface LobbyState {
    connection: LobbyConnection;
    /** The lobby, once the server sent it. */
    lobby: Lobby | null;
    /** This player's view of the game, once one is being played. */
    game: PlayerGameState | null;
    /** The game as a spectator watches it, without anyone's cards, once one is being played. */
    watching: SpectatorGameState | null;
    /** The move that this player sent, which the server hasn't answered yet. */
    pending: PlayerMove | null;
    /** What happened in the game's last update, so that the table can show it happening. */
    actions: Action[];
    /** The players of the last game, in the order that they went out, until the player dismisses them. */
    results: VictoryMessage["players"] | null;
    /** Whether the countdown before the game starts is running. */
    countingDown: boolean;
    /** The last error that the server reported, and when, so that a repeated one shows again. */
    error: { message: string; at: number } | null;
}

export const initialLobbyState: LobbyState = {
    connection: { kind: "connecting" },
    lobby: null,
    game: null,
    watching: null,
    pending: null,
    actions: [],
    results: null,
    countingDown: false,
    error: null,
};

/** What happened on the socket, as the lobby state sees it. */
export type LobbyEvent =
    | ({ type: "join" } & JoinMessage)
    | { type: "lobby"; lobby: Lobby }
    | { type: "countdown" }
    | { type: "start" }
    | { type: "game"; game: PlayerGameState; actions?: Action[] }
    | { type: "spectate"; game: SpectatorGameState; actions: Action[] }
    | { type: "move"; move: PlayerMove }
    | { type: "victory"; players: VictoryMessage["players"] }
    | { type: "dismissResults" }
    | { type: "message"; message: Message }
    | { type: "close"; reason: string }
    | { type: "left" }
    | { type: "error"; code: string; message: string; at: number }
    | { type: "disconnected"; reconnecting: boolean }
    | { type: "connectError"; retrying: boolean };

/**
 * The lobby and its game as they are when the client (re)joins: as a player, with the game as
 * they see it, or as a spectator, with the game that they watch.
 */
function joined(state: LobbyState, event: JoinMessage): LobbyState {
    const lobby = { ...state, connection: { kind: "joined" } as const, lobby: event.lobby };
    switch (event.as) {
        case "player":
            return { ...lobby, game: event.game ?? null, pending: null };
        case "spectator":
            return { ...lobby, watching: event.game ?? null };
    }
}

/** Apply what happened on the socket to the lobby state. */
export function reduceLobby(state: LobbyState, event: LobbyEvent): LobbyState {
    // Once closed, the lobby stays closed, whatever the socket does as it shuts down.
    if (state.connection.kind === "closed") {
        return state;
    }

    switch (event.type) {
        case "join":
            return joined(state, event);
        case "spectate":
            // The lobby's client hands on only updates newer than the last, as for a player's.
            return { ...state, watching: event.game, actions: event.actions };
        case "lobby": {
            // An update that arrived after a newer one. The same version can come again,
            // e.g. with the passphrase for the owner, so only an older one is left out.
            if (state.lobby && event.lobby.version < state.lobby.version) {
                return state;
            }

            // Updates for the whole room leave out the passphrase, which only the owner was
            // sent, so keep the one they have, unless the lobby no longer has one.
            const passphrase = event.lobby.hasPassphrase
                ? (event.lobby.passphrase ?? state.lobby?.passphrase)
                : undefined;
            return { ...state, lobby: { ...event.lobby, ...(passphrase && { passphrase }) } };
        }
        case "countdown":
            // A new game puts the last one's results away.
            return { ...state, countingDown: true, results: null };
        case "start":
            return { ...state, countingDown: false };
        case "game":
            // The lobby's client hands on only updates newer than the last, so this is the game now,
            // and the server answered the player's move, whether it took it or not.
            return {
                ...state,
                game: event.game,
                actions: event.actions ?? [],
                pending: null,
            };
        case "move":
            return state.game ? { ...state, pending: event.move } : state;
        case "victory":
            // The server puts the lobby back to waiting, ready for another game.
            return {
                ...state,
                lobby: state.lobby && { ...state.lobby, status: "waiting" },
                game: null,
                watching: null,
                pending: null,
                actions: [],
                results: event.players,
            };
        case "dismissResults":
            return { ...state, results: null };
        case "message": {
            if (!state.lobby) {
                return state;
            }

            // An update of the lobby can bring the message before the message itself arrives.
            const { message } = event;
            const seen = state.lobby.chat.some((other) => isSameMessage(other, message));
            return seen ? state : { ...state, lobby: { ...state.lobby, chat: [...state.lobby.chat, message] } };
        }
        case "close": {
            const reason = isServerCloseReason(event.reason) ? event.reason : "lobby_closed";
            return { ...state, connection: { kind: "closed", reason } };
        }
        case "left":
            return { ...state, connection: { kind: "closed", reason: "left" } };
        case "error":
            // The server turns a player away who isn't in the lobby.
            if (state.connection.kind === "connecting" && event.code === "unauthorized") {
                return { ...state, connection: { kind: "closed", reason: "unauthorized" } };
            }
            return {
                ...state,
                pending: null,
                error: { message: event.message, at: event.at },
            };
        case "disconnected":
            return {
                ...state,
                connection: event.reconnecting ? { kind: "reconnecting" } : { kind: "closed", reason: "disconnected" },
            };
        case "connectError":
            // The server refused the tokens, so the socket doesn't retry.
            if (!event.retrying) {
                return { ...state, connection: { kind: "closed", reason: "unauthorized" } };
            }
            return state;
    }
}
