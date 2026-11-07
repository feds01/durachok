import { useEffect } from "react";
import { io } from "socket.io-client";
import { create } from "zustand";

import { SOCKET_URL } from "@/config";
import { Root } from "@/interface/socket-client";
import { getAuthTokens, saveRefreshedTokens } from "@/utils/auth";
import { PlayerMove } from "@durachok/transport";

import { LobbyEvent, LobbyState, initialLobbyState, reduceLobby } from "./state";

interface LobbyStore extends LobbyState {
    /** The pin of the lobby that the client is connected to. */
    pin: string | null;

    /** The socket connection to the server. */
    socket: Root.Socket | null;

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

    /** Send a message to the lobby. */
    sendMessage: (message: string) => void;

    /** Make a move in the game. */
    dispatchMove: (move: PlayerMove) => void;
}

export const useLobbyStore = create<LobbyStore>((set, get) => {
    const dispatch = (event: LobbyEvent) => set((state) => reduceLobby(state, event));

    /** Run an action on the socket of the current lobby, if there is one. */
    const withSocket = (action: (socket: Root.Socket, pin: string) => void) => {
        const { socket, pin } = get();
        if (socket && pin) {
            action(socket, pin);
        }
    };

    return {
        ...initialLobbyState,
        pin: null,
        socket: null,

        connect: (pin) => {
            const socket: Root.Socket = io(SOCKET_URL, {
                // A function, so that each reconnection sends the tokens as they are then.
                auth: (cb) => cb(getAuthTokens()),
            });

            // `active` is false once the socket stops reconnecting: when the server refused
            // the tokens, or disconnected the client itself.
            socket.on("connect", () => socket.emit("join", pin));
            socket.on("connect_error", () => dispatch({ type: "connectError", retrying: socket.active }));
            socket.on("disconnect", () => dispatch({ type: "disconnected", reconnecting: socket.active }));
            socket.on("tokens", saveRefreshedTokens);

            socket.on("join", ({ lobby, game }) => dispatch({ type: "join", lobby, ...(game && { game }) }));
            socket.on("lobbyState", ({ lobby }) => dispatch({ type: "lobby", lobby }));
            socket.on("countdown", () => dispatch({ type: "countdown" }));
            socket.on("start", () => dispatch({ type: "start" }));
            socket.on("action", ({ update }) => dispatch({ type: "game", game: update }));
            socket.on("playerState", ({ update }) => dispatch({ type: "game", game: update }));
            socket.on("close", ({ reason }) => dispatch({ type: "close", reason }));
            socket.on("error", ({ type, message }) =>
                dispatch({ type: "error", code: type, at: Date.now(), ...(message && { message }) }),
            );

            set({ ...initialLobbyState, pin, socket });

            return () => {
                socket.removeAllListeners();
                socket.disconnect();

                if (get().socket === socket) {
                    set({ ...initialLobbyState, pin: null, socket: null });
                }
            };
        },

        start: () => withSocket((socket, pin) => socket.emit("start", pin)),
        kick: (name) => withSocket((socket, pin) => socket.emit("kick", pin, { name })),
        leave: () =>
            withSocket((socket, pin) => {
                socket.emit("leave", pin);
                dispatch({ type: "left" });
            }),
        rotatePassphrase: () => withSocket((socket, pin) => socket.emit("passphrase", pin)),
        sendMessage: (message) => withSocket((socket, pin) => socket.emit("message", pin, { message })),
        dispatchMove: (move) => withSocket((socket, pin) => socket.emit("move", pin, move)),
    };
});

/** Stay connected to a lobby while the component that calls this is mounted. */
export function useLobbyConnection(pin: string) {
    const connect = useLobbyStore((state) => state.connect);

    useEffect(() => connect(pin), [connect, pin]);
}
