import { describe, expect, test } from "bun:test";

import { Lobby, PlayerGameState } from "@durachok/transport";

import { LobbyEvent, LobbyState, initialLobbyState, reduceLobby } from "./state";

const lobby: Lobby = {
    pin: "123456",
    owner: { id: "owner-id", name: "owner" },
    hasPassphrase: false,
    version: 1,
    maxPlayers: 4,
    shortGameDeck: false,
    freeForAll: false,
    disableChat: false,
    randomisePlayerOrder: true,
    roundTimeout: 120,
    mythicMode: false,
    status: "waiting",
    players: [{ id: "owner-id", name: "owner" }],
    chat: [],
};

const game: PlayerGameState = {
    player: { name: "owner", deck: ["6S", "7S"], out: null, turned: false, beganRound: true, action: "attack" },
    players: [
        {
            name: "guest",
            deck: { type: "hidden", size: 6 },
            out: null,
            turned: false,
            beganRound: false,
            action: "defend",
        },
    ],
    tableTop: {},
    deckSize: 24,
    discardSize: 0,
    trump: { suit: "H", card: "AH", value: 14 },
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
        const withPassphrase = { ...lobby, hasPassphrase: true, passphrase: "♡♢♣♤" };
        const guest = { id: "guest", name: "guest" };
        const state = reduceAll([
            { type: "join", lobby: withPassphrase },
            { type: "lobby", lobby: { ...lobby, hasPassphrase: true, players: [...lobby.players, guest] } },
        ]);

        expect(state.lobby?.passphrase).toBe("♡♢♣♤");
        expect(state.lobby?.players).toHaveLength(2);
    });

    test("a new passphrase replaces the old one", () => {
        const state = reduceAll([
            { type: "join", lobby: { ...lobby, hasPassphrase: true, passphrase: "♡♢♣♤" } },
            { type: "lobby", lobby: { ...lobby, hasPassphrase: true, passphrase: "♤♣♢♡" } },
        ]);

        expect(state.lobby?.passphrase).toBe("♤♣♢♡");
    });

    test("the owner's passphrase goes once the lobby no longer has one", () => {
        const state = reduceAll([
            { type: "join", lobby: { ...lobby, hasPassphrase: true, passphrase: "♡♢♣♤" } },
            { type: "lobby", lobby: { ...lobby, hasPassphrase: false } },
        ]);

        expect(state.lobby).not.toHaveProperty("passphrase");
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
        const turnedAway = reduceLobby(initialLobbyState, {
            type: "error",
            code: "unauthorized",
            message: "Not in the lobby",
            at: 1,
        });
        expect(turnedAway.connection).toEqual({
            kind: "closed",
            reason: "unauthorized",
        });

        const joined = reduceAll([{ type: "join", lobby }]);
        const state = reduceLobby(joined, { type: "error", code: "bad_request", message: "Not enough players", at: 2 });
        expect(state.connection).toEqual({ kind: "joined" });
        expect(state.error).toEqual({ message: "Not enough players", at: 2 });
    });

    test("a move waits for the server's answer, whether it takes the move or not", () => {
        const playing = reduceAll([
            { type: "join", lobby: { ...lobby, status: "playing" }, game },
            { type: "move", move: { type: "place", card: "6S" } },
        ]);
        expect(playing.pending).toEqual({ type: "place", card: "6S" });

        const answered = reduceLobby(playing, {
            type: "game",
            game: { ...game, tableTop: { "6S": null } },
            actions: [{ type: "place", card: "6S", player: "owner" }],
        });
        expect(answered.pending).toBeNull();
        expect(answered.actions).toEqual([{ type: "place", card: "6S", player: "owner" }]);

        const refused = reduceLobby(playing, { type: "error", code: "invalid_move", message: "No", at: 3 });
        expect(refused.pending).toBeNull();
    });

    test("a move without a game is ignored", () => {
        const state = reduceAll([
            { type: "join", lobby },
            { type: "move", move: { type: "forfeit" } },
        ]);
        expect(state.pending).toBeNull();
    });

    test("the end of a game shows its results in the lobby, until the next game starts", () => {
        const players = [
            { name: "guest", out: 1 },
            { name: "owner", out: null },
        ];
        const finished = reduceAll([
            { type: "join", lobby: { ...lobby, status: "playing" }, game },
            { type: "victory", players },
        ]);

        expect(finished.lobby?.status).toBe("waiting");
        expect(finished.game).toBeNull();
        expect(finished.results).toEqual(players);
        expect(reduceLobby(finished, { type: "dismissResults" }).results).toBeNull();
        expect(reduceLobby(finished, { type: "countdown" }).results).toBeNull();
    });

    test("a message joins the lobby's chat", () => {
        const message = { name: "guest", time: 1, message: "hello" };
        const state = reduceAll([
            { type: "join", lobby },
            { type: "message", message },
        ]);

        expect(state.lobby?.chat).toEqual([message]);
    });

    test("a message that an update of the lobby already brought isn't added again", () => {
        const message = { name: "guest", time: 1, message: "hello" };
        const state = reduceAll([
            { type: "join", lobby },
            { type: "lobby", lobby: { ...lobby, version: 2, chat: [message] } },
            { type: "message", message },
        ]);

        expect(state.lobby?.chat).toEqual([message]);
    });

    test("an update of the lobby that arrives after a newer one is left out", () => {
        const guest = { id: "guest", name: "guest" };
        const state = reduceAll([
            { type: "join", lobby },
            { type: "lobby", lobby: { ...lobby, version: 3, players: [...lobby.players, guest] } },
            { type: "lobby", lobby: { ...lobby, version: 2 } },
        ]);

        expect(state.lobby?.version).toBe(3);
        expect(state.lobby?.players).toHaveLength(2);
    });

    test("the owner is sent the lobby again at the same version, with the passphrase", () => {
        const state = reduceAll([
            { type: "join", lobby },
            { type: "lobby", lobby: { ...lobby, version: 2, hasPassphrase: true } },
            { type: "lobby", lobby: { ...lobby, version: 2, hasPassphrase: true, passphrase: "♡♢♣♤" } },
        ]);

        expect(state.lobby?.passphrase).toBe("♡♢♣♤");
    });
});
