import { PlayerGameState, SpectatorGameState } from "../schemas/game";
import { Lobby } from "../schemas/lobby";
import { ClientSocket, LobbyClient } from "./lobby";
import { describe, expect, test } from "bun:test";

/** A lobby, as the server sends it. */
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
    allowSpectators: true,
    status: "waiting",
    players: [{ id: "owner-id", name: "owner" }],
    chat: [],
};

/** The game, as its player sees it. */
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
    trump: { suit: "H", card: "AH" },
};

/** The game, as a spectator watches it, without anyone's cards. */
const watched: SpectatorGameState = {
    players: [
        {
            name: "owner",
            deck: { type: "hidden", size: 2 },
            out: null,
            turned: false,
            beganRound: true,
            action: "attack",
        },
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
    trump: game.trump,
};

/** A socket that records what is sent on it, and hands on what a test says that the server sent. */
class FakeSocket implements ClientSocket {
    public sent: unknown[][] = [];
    private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

    public on(event: string, listener: (...args: unknown[]) => void) {
        this.listeners.set(event, new Set([...(this.listeners.get(event) ?? []), listener]));
    }

    public off(event: string, listener: (...args: unknown[]) => void) {
        this.listeners.get(event)?.delete(listener);
    }

    public emit(event: string, ...args: unknown[]) {
        this.sent.push([event, ...args]);
    }

    /** The socket connects, or the server sends an event. */
    public receive(event: string, ...args: unknown[]) {
        this.listeners.get(event)?.forEach((listener) => listener(...args));
    }
}

describe("A lobby client", () => {
    test("joins the lobby whenever the socket connects", () => {
        const socket = new FakeSocket();
        const client = new LobbyClient(socket, "123456");

        socket.receive("connect");
        socket.receive("connect");

        expect(socket.sent).toEqual([
            ["join", client.pin],
            ["join", client.pin],
        ]);
    });

    test("sends each request for its lobby", () => {
        const socket = new FakeSocket();
        const client = new LobbyClient(socket, "123456");

        client.move({ type: "place", card: "6S" });
        client.kick("guest");
        client.sendMessage("hello");
        client.start();

        expect(socket.sent).toEqual([
            ["move", "123456", { type: "place", card: "6S" }],
            ["kick", "123456", { name: "guest" }],
            ["message", "123456", { message: "hello" }],
            ["start", "123456"],
        ]);
    });

    test("hands on what the server sends, until it stops listening", () => {
        const socket = new FakeSocket();
        const client = new LobbyClient(socket, "123456");
        const reasons: string[] = [];

        const stop = client.on("close", ({ reason }) => reasons.push(reason));
        socket.receive("close", { reason: "kicked" });
        stop();
        socket.receive("close", { reason: "lobby_closed" });

        expect(reasons).toEqual(["kicked"]);
    });

    test("hands on an update of the game only if it's newer than the last", () => {
        const socket = new FakeSocket();
        const client = new LobbyClient(socket, "123456");
        const seen: string[] = [];
        client.onUpdate("action", ({ version }) => seen.push(`action ${version}`));
        client.onUpdate("playerState", ({ version }) => seen.push(`state ${version}`));

        socket.receive("action", { actions: [], update: game, version: 1 });
        socket.receive("action", { actions: [], update: game, version: 3 });
        // An action that arrived after a newer one, or again.
        socket.receive("action", { actions: [], update: game, version: 2 });
        socket.receive("action", { actions: [], update: game, version: 3 });
        // The game again, after the server refused a move, and an older one.
        socket.receive("playerState", { update: game, version: 3 });
        socket.receive("playerState", { update: game, version: 2 });

        expect(seen).toEqual(["action 1", "action 3", "state 3"]);
    });

    test("takes the game on joining as the newest, whose versions count on into the next game", () => {
        const socket = new FakeSocket();
        const client = new LobbyClient(socket, "123456");
        const versions: number[] = [];
        client.onUpdate("action", ({ version }) => versions.push(version));

        socket.receive("join", { as: "player", lobby, game, gameVersion: 40 });
        socket.receive("action", { actions: [], update: game, version: 39 });
        socket.receive("action", { actions: [], update: game, version: 41 });

        expect(versions).toEqual([41]);
    });

    test("hands on a spectator's updates as it does a player's, from the game that watching brought", () => {
        const socket = new FakeSocket();
        const client = new LobbyClient(socket, "123456");
        const versions: number[] = [];
        client.onUpdate("spectate", ({ version }) => versions.push(version));

        socket.receive("join", { as: "spectator", lobby, game: watched, gameVersion: 10 });
        socket.receive("spectate", { actions: [], update: watched, version: 10 });
        socket.receive("spectate", { actions: [], update: watched, version: 12 });
        socket.receive("spectate", { actions: [], update: watched, version: 11 });

        expect(versions).toEqual([12]);
    });

    test("stops handing on the game's updates to a listener that stopped listening", () => {
        const socket = new FakeSocket();
        const client = new LobbyClient(socket, "123456");
        const versions: number[] = [];

        const stop = client.onUpdate("action", ({ version }) => versions.push(version));
        socket.receive("action", { actions: [], update: game, version: 1 });
        stop();
        socket.receive("action", { actions: [], update: game, version: 2 });

        expect(versions).toEqual([1]);
    });
});
