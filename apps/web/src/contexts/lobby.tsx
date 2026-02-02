import { create } from "zustand";

import { Root } from "@/interface/socket-client";
import { assert, isDef } from "@/utils";
import { OpaquePlayerState, PlayerGameState, PlayerMove } from "@durachok/transport";

/**
 * A store that represents a wrapper around the current player's game state.
 *
 * This store provides a collection of useful getters and actions to interact
 * with the game state. Communication with the server is done through the socket
 * connection that is provided by the store.
 *
 * During initialisation, the store should be provided with the socket connection
 * to the server, and the pin of the lobby that the player is in.
 */
interface PlayerGameStateStore {
    /** ====== State ====== */

    /** The pin of the lobby that we are in. */
    pin: string;

    /** The current game state. */
    state: PlayerGameState | null;

    /** The socket connection to the server. */
    socket: Root.Socket | null;

    /** ====== Actions ====== */

    /** Dispatch a move to the server. */
    dispatchMove: (move: PlayerMove) => void;

    /** Send a message to the lobby. */
    sendMessage: (message: string) => void;

    /** ====== Getters ====== */

    /** Get the current table state. */
    getTableState: () => Record<string, string | null>;

    /** Get the players in the game. */
    getPlayers: () => OpaquePlayerState[];

    /** Get the current player's deck. */
    getCurrentPlayerDeck: () => string[];

    /** ====== State update handlers ====== */

    /** Update the game state. */
    updateGameState: (newState: PlayerGameState) => void;

    /** Set the socket connection. */
    init: (pin: string, socket: Root.Socket) => void;
}

const usePlayerGameStore = create<PlayerGameStateStore>((set, get) => ({
    state: null,
    socket: null,
    pin: "",

    dispatchMove: (move: PlayerMove) => {
        const { socket, pin } = get();
        assert(isDef(socket), "Socket is not initialized");

        socket.emit("move", pin, move);
    },

    sendMessage: (message: string) => {
        const { socket, pin } = get();
        assert(isDef(socket), "Socket is not initialized");

        socket.emit("message", pin, { message });
    },

    getTableState: () => {
        const { state } = get();
        assert(isDef(state), "Game state is not initialized");

        return state.tableTop;
    },

    getPlayers: () => {
        const { state } = get();
        assert(isDef(state), "Game state is not initialized");

        return state.players;
    },

    getCurrentPlayerDeck: () => {
        const { state } = get();
        assert(isDef(state), "Game state is not initialized");

        // get the visible deck of the current player
        const currentPlayer = state.players.find((player) => player.deck.type === "visible");

        if (currentPlayer && currentPlayer.deck.type === "visible") {
            return currentPlayer.deck.cards;
        }

        return [];
    },

    updateGameState: (state: PlayerGameState) => {
        set({ state });
    },

    init: (pin: string, socket: Root.Socket) => {
        set({ socket, pin });
    },
}));

export default usePlayerGameStore;
