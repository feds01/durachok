import { Lobby, PlayerGameState } from "@durachok/transport";

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
    | { kind: "connecting" }
    | { kind: "joined" }
    /** The connection dropped while in the lobby, and the socket is reconnecting. */
    | { kind: "reconnecting" }
    | { kind: "closed"; reason: CloseReason };

export interface LobbyState {
    connection: LobbyConnection;
    /** The lobby, once the server sent it. */
    lobby: Lobby | null;
    /** This player's view of the game, once one is being played. */
    game: PlayerGameState | null;
    /** Whether the countdown before the game starts is running. */
    countingDown: boolean;
    /** The last error that the server reported, and when, so that a repeated one shows again. */
    error: { message: string; at: number } | null;
}

export const initialLobbyState: LobbyState = {
    connection: { kind: "connecting" },
    lobby: null,
    game: null,
    countingDown: false,
    error: null,
};

/** What happened on the socket, as the lobby state sees it. */
export type LobbyEvent =
    | { type: "join"; lobby: Lobby; game?: PlayerGameState }
    | { type: "lobby"; lobby: Lobby }
    | { type: "countdown" }
    | { type: "start" }
    | { type: "game"; game: PlayerGameState }
    | { type: "close"; reason: string }
    | { type: "left" }
    | { type: "error"; code: string; message?: string; at: number }
    | { type: "disconnected"; reconnecting: boolean }
    | { type: "connectError"; retrying: boolean };

/** Apply what happened on the socket to the lobby state. */
export function reduceLobby(state: LobbyState, event: LobbyEvent): LobbyState {
    // Once closed, the lobby stays closed, whatever the socket does as it shuts down.
    if (state.connection.kind === "closed") {
        return state;
    }

    switch (event.type) {
        case "join":
            return {
                ...state,
                connection: { kind: "joined" },
                lobby: event.lobby,
                game: event.game ?? null,
            };
        case "lobby": {
            // Updates for the whole room leave out the passphrase, which only the owner was
            // sent, so keep the one they have, unless the lobby no longer has one.
            const passphrase = event.lobby.hasPassphrase
                ? (event.lobby.passphrase ?? state.lobby?.passphrase)
                : undefined;
            return { ...state, lobby: { ...event.lobby, ...(passphrase && { passphrase }) } };
        }
        case "countdown":
            return { ...state, countingDown: true };
        case "start":
            return { ...state, countingDown: false };
        case "game":
            return { ...state, game: event.game };
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
            return { ...state, error: { message: event.message ?? describeError(event.code), at: event.at } };
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

/** A message for an error that the server reported without one. */
function describeError(code: string): string {
    switch (code) {
        case "unauthorized":
            return "You can't do that in this lobby.";
        case "not_found":
            return "The lobby no longer exists.";
        case "bad_request":
            return "That isn't possible right now.";
        default:
            return "Something went wrong on the server.";
    }
}
