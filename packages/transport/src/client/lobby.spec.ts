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
});
