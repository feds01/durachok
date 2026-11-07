import { describe, expect, test } from "bun:test";

import { Lobby } from "@durachok/transport";

import { LobbyEvent, LobbyState, initialLobbyState, reduceLobby } from "./state";

const lobby: Lobby = {
    pin: "123456",
    owner: { id: "owner-id", name: "owner" },
    maxPlayers: 4,
    shortGameDeck: false,
    freeForAll: false,
    disableChat: false,
    randomisePlayerOrder: true,
    roundTimeout: 120,
    status: "waiting",
    players: [{ id: "owner-id", name: "owner" }],
    chat: [],
};

function reduceAll(events: LobbyEvent[], state: LobbyState = initialLobbyState): LobbyState {
    return events.reduce(reduceLobby, state);
}

describe("lobby state", () => {
    test("joining a lobby stores it", () => {
        const state = reduceAll([{ type: "join", lobby }]);

        expect(state.connection).toEqual({ kind: "joined" });
        expect(state.lobby).toEqual(lobby);
        expect(state.game).toBeNull();
    });

    test("the owner keeps the passphrase when an update for the room leaves it out", () => {
        const withPassphrase = { ...lobby, passphrase: "♡♢♣♤" };
        const guest = { id: "guest", name: "guest" };
        const state = reduceAll([
            { type: "join", lobby: withPassphrase },
            { type: "lobby", lobby: { ...lobby, players: [...lobby.players, guest] } },
        ]);

        expect(state.lobby?.passphrase).toBe("♡♢♣♤");
        expect(state.lobby?.players).toHaveLength(2);
    });

    test("a new passphrase replaces the old one", () => {
        const state = reduceAll([
            { type: "join", lobby: { ...lobby, passphrase: "♡♢♣♤" } },
            { type: "lobby", lobby: { ...lobby, passphrase: "♤♣♢♡" } },
        ]);

        expect(state.lobby?.passphrase).toBe("♤♣♢♡");
    });

    test("players who never had the passphrase don't get one", () => {
        const state = reduceAll([
            { type: "join", lobby },
            { type: "lobby", lobby },
        ]);

        expect(state.lobby).not.toHaveProperty("passphrase");
    });

    test("the countdown runs until the game starts", () => {
        const counting = reduceAll([{ type: "join", lobby }, { type: "countdown" }]);
        expect(counting.countingDown).toBe(true);

        expect(reduceLobby(counting, { type: "start" }).countingDown).toBe(false);
    });

    test("the server's close reasons close the lobby, and unknown ones read as a closed lobby", () => {
        const joined = reduceAll([{ type: "join", lobby }]);

        expect(reduceLobby(joined, { type: "close", reason: "kicked" }).connection).toEqual({
            kind: "closed",
            reason: "kicked",
        });
        expect(reduceLobby(joined, { type: "close", reason: "something_new" }).connection).toEqual({
            kind: "closed",
            reason: "lobby_closed",
        });
    });

    test("a closed lobby stays closed as the socket shuts down", () => {
        const state = reduceAll([
            { type: "join", lobby },
            { type: "close", reason: "kicked" },
            { type: "disconnected", reconnecting: true },
            { type: "join", lobby },
        ]);

        expect(state.connection).toEqual({ kind: "closed", reason: "kicked" });
    });

    test("refused tokens close the lobby, but a server that is down is retried", () => {
        expect(reduceLobby(initialLobbyState, { type: "connectError", retrying: false }).connection).toEqual({
            kind: "closed",
            reason: "unauthorized",
        });
        expect(reduceLobby(initialLobbyState, { type: "connectError", retrying: true }).connection).toEqual({
            kind: "connecting",
        });
    });

    test("a dropped connection reconnects and rejoins", () => {
        const dropped = reduceAll([
            { type: "join", lobby },
            { type: "disconnected", reconnecting: true },
        ]);
        expect(dropped.connection).toEqual({ kind: "reconnecting" });

        expect(reduceLobby(dropped, { type: "join", lobby }).connection).toEqual({ kind: "joined" });
    });

    test("being turned away while joining closes the lobby, and later errors are shown", () => {
        expect(reduceLobby(initialLobbyState, { type: "error", code: "unauthorized", at: 1 }).connection).toEqual({
            kind: "closed",
            reason: "unauthorized",
        });

        const joined = reduceAll([{ type: "join", lobby }]);
        const state = reduceLobby(joined, { type: "error", code: "bad_request", message: "Not enough players", at: 2 });
        expect(state.connection).toEqual({ kind: "joined" });
        expect(state.error).toEqual({ message: "Not enough players", at: 2 });
    });
});
