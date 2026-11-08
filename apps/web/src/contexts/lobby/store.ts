import { useEffect } from "react";
import { io } from "socket.io-client";
import { create } from "zustand";

import { SOCKET_URL } from "@/config";
import { getAuthTokens, saveRefreshedTokens } from "@/utils/auth";
import { GameSettings, LobbyClient, PlayerMove } from "@durachok/transport";

import { LobbyEvent, LobbyState, initialLobbyState, reduceLobby } from "./state";

interface LobbyStore extends LobbyState {
    /** The client of the lobby that this player is connected to. */
    client: LobbyClient | null;

    /**
     * Connect to a lobby and join it, and rejoin it whenever the socket reconnects.
     *
     * @returns A function that disconnects, and resets the store.
     */
    connect: (pin: string) => () => void;

    /** Start the game, which only the owner can do. */
    start: () => void;

    /** Remove a player from the lobby, which only the owner can do. */
    kick: (name: string) => void;

    /** Leave the lobby, which the owner can't do. */
    leave: () => void;

    /** Give the lobby a new passphrase, which only the owner can do. */
    rotatePassphrase: () => void;

    /** Change the lobby's settings, which only the owner can do, before the game starts. */
    updateSettings: (settings: GameSettings) => void;

    /** Send a message to the lobby. */
    sendMessage: (message: string) => void;

    /** Make a move in the game, which the player sees straight away, until the server answers it. */
    dispatchMove: (move: PlayerMove) => void;

    /** Put away the results of the last game. */
    dismissResults: () => void;
}

export const useLobbyStore = create<LobbyStore>((set, get) => {
    const dispatch = (event: LobbyEvent) => set((state) => reduceLobby(state, event));

    return {
        ...initialLobbyState,
        client: null,

        connect: (pin) => {
            const socket = io(SOCKET_URL, {
                // A function, so that each reconnection sends the tokens as they are then.
                auth: (cb) => cb(getAuthTokens()),
            });
            const client = new LobbyClient(socket, pin);

            // `active` is false once the socket stops reconnecting: when the server refused
            // the tokens, or disconnected the client itself.
            socket.on("connect_error", () => dispatch({ type: "connectError", retrying: socket.active }));
            socket.on("disconnect", () => dispatch({ type: "disconnected", reconnecting: socket.active }));
            client.on("tokens", saveRefreshedTokens);

            client.on("join", ({ lobby, game, gameVersion }) =>
                dispatch({
                    type: "join",
                    lobby,
                    ...(game && gameVersion !== undefined && { game: { state: game, version: gameVersion } }),
                }),
            );
            client.on("lobbyState", ({ lobby }) => dispatch({ type: "lobby", lobby }));
            client.on("countdown", () => dispatch({ type: "countdown" }));
            client.on("start", () => dispatch({ type: "start" }));
            client.on("action", ({ actions, update, version }) =>
                dispatch({ type: "game", game: update, version, actions }),
            );
            client.on("playerState", ({ update, version }) => dispatch({ type: "game", game: update, version }));
            client.on("victory", ({ players }) => dispatch({ type: "victory", players }));
            client.on("message", (message) => dispatch({ type: "message", message }));
            client.on("close", ({ reason }) => dispatch({ type: "close", reason }));
            client.on("error", ({ type, message }) => dispatch({ type: "error", code: type, message, at: Date.now() }));

            set({ ...initialLobbyState, client });

            return () => {
                socket.removeAllListeners();
                socket.disconnect();

                if (get().client === client) {
                    set({ ...initialLobbyState, client: null });
                }
            };
        },

        start: () => get().client?.start(),
        kick: (name) => get().client?.kick(name),
        leave: () => {
            const { client } = get();
            if (client) {
                client.leave();
                dispatch({ type: "left" });
            }
        },
        rotatePassphrase: () => get().client?.rotatePassphrase(),
        updateSettings: (settings) => get().client?.updateSettings(settings),
        sendMessage: (message) => get().client?.sendMessage(message),
        dispatchMove: (move) => {
            const { client } = get();
            if (client) {
                dispatch({ type: "move", move });
                client.move(move);
            }
        },
        dismissResults: () => dispatch({ type: "dismissResults" }),
    };
});

/** Stay connected to a lobby while the component that calls this is mounted. */
export function useLobbyConnection(pin: string) {
    const connect = useLobbyStore((state) => state.connect);

    useEffect(() => connect(pin), [connect, pin]);
}
