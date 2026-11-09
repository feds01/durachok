import { ClientSocket, LobbyClient } from "./lobby";
import { describe, expect, test } from "bun:test";

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
        client.on("action", ({ version }) => seen.push(`action ${version}`));
        client.on("playerState", ({ version }) => seen.push(`state ${version}`));

        socket.receive("action", { actions: [], update: {}, version: 1 });
        socket.receive("action", { actions: [], update: {}, version: 3 });
        // An action that arrived after a newer one, or again.
        socket.receive("action", { actions: [], update: {}, version: 2 });
        socket.receive("action", { actions: [], update: {}, version: 3 });
        // The game again, after the server refused a move, and an older one.
        socket.receive("playerState", { update: {}, version: 3 });
        socket.receive("playerState", { update: {}, version: 2 });

        expect(seen).toEqual(["action 1", "action 3", "state 3"]);
    });

    test("takes the game on joining as the newest, whose versions count on into the next game", () => {
        const socket = new FakeSocket();
        const client = new LobbyClient(socket, "123456");
        const versions: number[] = [];
        client.on("action", ({ version }) => versions.push(version));

        socket.receive("join", { lobby: {}, game: {}, gameVersion: 40 });
        socket.receive("action", { actions: [], update: {}, version: 39 });
        socket.receive("action", { actions: [], update: {}, version: 41 });

        expect(versions).toEqual([41]);
    });

    test("stops handing on the game's updates to a listener that stopped listening", () => {
        const socket = new FakeSocket();
        const client = new LobbyClient(socket, "123456");
        const versions: number[] = [];

        const stop = client.on("action", ({ version }) => versions.push(version));
        socket.receive("action", { actions: [], update: {}, version: 1 });
        stop();
        socket.receive("action", { actions: [], update: {}, version: 2 });

        expect(versions).toEqual([1]);
    });
});
