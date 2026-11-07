/**
 * Plays a whole game through the server, as the web app would: a registered owner creates
 * a lobby, an anonymous player joins it, both connect over sockets, and they play until
 * one of them wins. It needs MongoDB, at `TEST_MONGODB_URI` or on localhost (`just db`),
 * and uses a database of its own, which it drops afterwards. Set `TEST_SERVER_LOG` to a
 * file to keep the server's logs.
 */
import type { PlayerGameState, PlayerMove } from "@durachok/transport";
import type { Subprocess } from "bun";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import mongoose from "mongoose";
import { io, Socket } from "socket.io-client";

const MONGO = process.env.TEST_MONGODB_URI ?? "mongodb://localhost:27017";
const DB_URI = `${MONGO}/durachok-test-${crypto.randomUUID().slice(0, 8)}`;
const PORT = 20000 + Math.floor(Math.random() * 10000);
const BASE = `http://localhost:${PORT}`;

/** Whether MongoDB answers. CI must have it, so waits for it to start there. */
async function mongoAvailable(): Promise<boolean> {
    try {
        const connection = await mongoose
            .createConnection(MONGO, { serverSelectionTimeoutMS: process.env.CI ? 30_000 : 1000 })
            .asPromise();
        await connection.close();
        return true;
    } catch {
        return false;
    }
}

const available = await mongoAvailable();
if (!available && process.env.CI) {
    throw new Error(`MongoDB isn't reachable at ${MONGO}.`);
}

type Tokens = { token: string; refreshToken: string };

/** Call a tRPC procedure, as the web app's client does. */
async function trpc<T>(path: string, input: unknown, tokens?: Tokens, method: "GET" | "POST" = "POST"): Promise<T> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (tokens) {
        headers["x-token"] = tokens.token;
        headers["x-refresh-token"] = tokens.refreshToken;
    }

    const body = JSON.stringify({ json: input });
    const response = await fetch(
        method === "GET" ? `${BASE}/api/trpc/${path}?input=${encodeURIComponent(body)}` : `${BASE}/api/trpc/${path}`,
        method === "GET" ? { headers } : { method, headers, body },
    );
    const result = (await response.json()) as {
        result: { data: { json: T } };
        error?: { json?: { message?: string } };
    };
    if (!response.ok) {
        throw new Error(`${path} failed with ${response.status}: ${result.error?.json?.message}`);
    }

    return result.result.data.json;
}

/** Connect a socket, resolving once it has connected, or rejecting with the connection error. */
function connect(tokens?: Tokens): Promise<Socket> {
    const socket = io(BASE, { auth: tokens ?? {}, transports: ["websocket"], reconnection: false });

    return new Promise((resolve, reject) => {
        socket.once("connect", () => resolve(socket));
        socket.once("connect_error", (error) => {
            socket.close();
            reject(error);
        });
    });
}

/** Wait for a socket to receive an event whose payload passes a check. */
function waitFor<T>(socket: Socket, event: string, check: (payload: T) => boolean, timeout = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
        const listener = (payload: T) => {
            if (!check(payload)) return;
            clearTimeout(timer);
            socket.off(event, listener);
            resolve(payload);
        };
        const timer = setTimeout(() => {
            socket.off(event, listener);
            reject(new Error(`No matching '${event}' within ${timeout}ms`));
        }, timeout);
        socket.on(event, listener);
    });
}

/** Wait for the next time a socket receives an event. */
function next<T>(socket: Socket, event: string, timeout = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`No '${event}' within ${timeout}ms`)), timeout);
        socket.once(event, (payload: T) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
}

let server: Subprocess | undefined;
const sockets: Socket[] = [];

beforeAll(async () => {
    if (!available) return;

    server = Bun.spawn(["bun", "src/index.ts"], {
        cwd: `${import.meta.dir}/..`,
        env: { ...process.env, PORT: String(PORT), MONGODB_URI: DB_URI, GAME_COUNTDOWN_MS: "0", NODE_ENV: "test" },
        stdout: process.env.TEST_SERVER_LOG ? Bun.file(process.env.TEST_SERVER_LOG) : "ignore",
        stderr: "inherit",
    });

    // Wait for the server to listen, and to connect to the database.
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            await fetch(BASE);
            await connect().catch((error: Error) => {
                if (error.message !== "unauthorized") throw error;
            });
            return;
        } catch {
            await Bun.sleep(100);
        }
    }
    throw new Error("The server didn't start.");
});

afterAll(async () => {
    sockets.forEach((socket) => socket.close());
    server?.kill();

    if (available) {
        const connection = await mongoose.createConnection(DB_URI).asPromise();
        await connection.dropDatabase();
        await connection.close();
    }
});

describe.skipIf(!available)("Game flow", () => {
    test("two players play a whole game", async () => {
        // The owner registers, and creates a lobby with a passphrase.
        const id = crypto.randomUUID().slice(0, 8);
        const ownerTokens = await trpc<Tokens>("auth.register", {
            name: `owner-${id}`,
            email: `owner-${id}@example.com`,
            password: "Password123!",
            reCaptchaToken: "test",
        });
        const { pin } = await trpc<{ pin: string }>(
            "lobbies.create",
            { settings: { maxPlayers: 2, passphrase: true, shortGameDeck: true, roundTimeout: 120 } },
            ownerTokens,
        );

        // Sockets need tokens.
        await expect(connect()).rejects.toThrow("unauthorized");

        const owner = await connect(ownerTokens);
        sockets.push(owner);
        const ownerJoin = next<{ lobby: { passphrase?: string; players: unknown[] } }>(owner, "join");
        owner.emit("join", pin);
        const { lobby } = await ownerJoin;
        expect(lobby.passphrase).toMatch(/^[♡♢♣♤]{4}$/);
        expect(lobby.players).toHaveLength(1);

        // An anonymous player joins with the passphrase that the owner sees.
        await expect(trpc("lobbies.join", { pin, name: "guest", passphrase: "♡♡♡♡" })).rejects.toThrow("401");
        const guestTokens = await trpc<Tokens>("lobbies.join", { pin, name: "guest", passphrase: lobby.passphrase });
        expect(guestTokens.token).toBeString();

        const guest = await connect(guestTokens);
        sockets.push(guest);
        const ownerSeesGuest = next<{ lobby: { players: { name: string }[] } }>(owner, "lobbyState");
        const guestJoin = next<{ lobby: { passphrase?: string } }>(guest, "join");
        guest.emit("join", pin);
        expect((await guestJoin).lobby.passphrase).toBeUndefined();
        expect((await ownerSeesGuest).lobby.players.map((p) => p.name)).toContain("guest");

        // Chat reaches everyone.
        const message = next<{ name: string; message: string }>(owner, "message");
        guest.emit("message", pin, { message: "good luck" });
        expect(await message).toMatchObject({ name: "guest", message: "good luck" });

        // Only the owner can start the game.
        const refused = next<{ type: string }>(guest, "error");
        guest.emit("start", pin);
        expect((await refused).type).toBe("unauthorized");

        // Keep each player's latest view of the game.
        const players = [
            { name: `owner-${id}`, socket: owner },
            { name: "guest", socket: guest },
        ];
        // Every player receives one action for each accepted move, so counting them tells
        // when everyone has seen a move.
        const states = new Map<Socket, PlayerGameState>();
        const actionCounts = new Map<Socket, number>();
        for (const { socket } of players) {
            socket.on("action", ({ update }: { update: PlayerGameState }) => {
                states.set(socket, update);
                actionCounts.set(socket, (actionCounts.get(socket) ?? 0) + 1);
            });
            socket.on("playerState", ({ update }: { update: PlayerGameState }) => states.set(socket, update));
        }
        const actionsSeen = () => players.map(({ socket }) => actionCounts.get(socket) ?? 0);

        let victory: { players: { name: string; out: number | null }[] } | undefined;
        const log: string[] = [];
        const begun = Date.now();
        owner.on("victory", (payload) => (victory = payload));
        // Once it's over, each player is sent the lobby, which waits for another game.
        const gameOver = new Map<Socket, string>();
        for (const { socket } of players) {
            socket.on(
                "lobbyState",
                ({ update, lobby: { status } }: { update: { type: string }; lobby: { status: string } }) => {
                    if (update.type === "game_over") gameOver.set(socket, status);
                },
            );
        }

        const started = Promise.all(players.map(({ socket }) => next(socket, "action")));
        owner.emit("start", pin);
        await started;

        /**
         * Send a move, and resolve with whether the server accepted it: it answers an accepted
         * move with an action to every player, and a rejected one with an error, then the game
         * state, to the player who made it. Once the game has finished, it only sends an error.
         */
        function tryMove(socket: Socket, move: PlayerMove): Promise<boolean> {
            const before = actionsSeen();

            return new Promise((resolve, reject) => {
                let rejected = false;
                const onError = ({ type }: { type: string }) => {
                    rejected = true;
                    if (type === "stale_game") finish(false);
                };
                const onState = () => rejected && finish(false);
                const timer = setTimeout(() => {
                    cleanup();
                    reject(new Error(`No answer to ${JSON.stringify(move)}`));
                }, 5000);
                const poll = setInterval(() => {
                    if (actionsSeen().every((count, i) => count > before[i]!)) finish(true);
                }, 2);

                function cleanup() {
                    clearTimeout(timer);
                    clearInterval(poll);
                    socket.off("error", onError).off("playerState", onState);
                }

                function finish(accepted: boolean) {
                    cleanup();
                    if (accepted)
                        log.push(`${players.find((p) => p.socket === socket)?.name}: ${JSON.stringify(move)}`);
                    resolve(accepted);
                }

                socket.on("error", onError).on("playerState", onState);
                socket.emit("move", pin, move);
            });
        }

        /** Make a move for a player, if they have one to make: cover, attack, or else give up the round. */
        async function play(socket: Socket): Promise<boolean> {
            const state = states.get(socket)!;
            const { action, deck, turned } = state.player;
            const tableTop = Object.values(state.tableTop);

            if (action === "defend" && !turned) {
                const uncovered = tableTop.flatMap((cover, position) => (cover === null ? [position] : []));
                if (uncovered.length === 0) return false;

                for (const position of uncovered) {
                    for (const card of deck) {
                        if (await tryMove(socket, { type: "cover", card, position })) return true;
                    }
                }
                return tryMove(socket, { type: "forfeit" });
            }

            if (action === "attack" && !turned) {
                for (const card of deck) {
                    if (await tryMove(socket, { type: "place", card })) return true;
                }
                return tableTop.length > 0 && tryMove(socket, { type: "forfeit" });
            }

            return false;
        }

        for (let moves = 0, idle = 0; !victory && moves < 500;) {
            let moved = false;
            for (const { socket } of players) {
                if (!victory && (await play(socket))) {
                    moved = true;
                    moves++;
                }
            }

            // Let the last broadcasts arrive before deciding that nobody can move.
            idle = moved ? 0 : idle + 1;
            if (idle > 20 || Date.now() - begun > 40_000) {
                const views = players.map(({ name, socket }) => ({ name, ...states.get(socket) }));
                throw new Error(
                    `Stuck after ${moves} moves:\n${log.slice(-40).join("\n")}\n${JSON.stringify(views, null, 1)}`,
                );
            }
            if (!moved) await Bun.sleep(50);
        }

        await Bun.sleep(50);
        expect(victory).toBeDefined();
        expect(victory!.players.map((p) => p.name).sort()).toEqual(players.map((p) => p.name).sort());

        expect(players.map(({ socket }) => gameOver.get(socket))).toEqual(players.map(() => "waiting"));

        // The lobby waits for another game, with both players still in it.
        const after = await trpc<{ status: string; players: unknown[] }>("lobbies.get", { pin }, ownerTokens, "GET");
        expect(after.status).toBe("waiting");
        expect(after.players).toHaveLength(2);
    }, 60_000);

    test("the owner changes the lobby's settings before the game", async () => {
        type LobbyUpdate = {
            lobby: {
                maxPlayers: number;
                hasPassphrase: boolean;
                passphrase?: string;
                disableChat: boolean;
                mythicMode: boolean;
            };
        };
        const settings = {
            maxPlayers: 3,
            passphrase: true,
            shortGameDeck: true,
            freeForAll: false,
            disableChat: true,
            randomisePlayerOrder: false,
            roundTimeout: 200,
            mythicMode: true,
        };

        const id = crypto.randomUUID().slice(0, 8);
        const ownerTokens = await trpc<Tokens>("auth.register", {
            name: `host-${id}`,
            email: `host-${id}@example.com`,
            password: "Password123!",
            reCaptchaToken: "test",
        });
        const { pin } = await trpc<{ pin: string }>(
            "lobbies.create",
            { settings: { maxPlayers: 4, passphrase: false, roundTimeout: 120 } },
            ownerTokens,
        );

        const owner = await connect(ownerTokens);
        sockets.push(owner);
        const ownerJoin = next(owner, "join");
        owner.emit("join", pin);
        await ownerJoin;

        const guestTokens = await trpc<Tokens>("lobbies.join", { pin, name: "guest" });
        const guest = await connect(guestTokens);
        sockets.push(guest);
        const guestJoin = next(guest, "join");
        guest.emit("join", pin);
        await guestJoin;

        // Everyone sees the new settings, and only the owner the new passphrase.
        const guestSees = waitFor<LobbyUpdate>(guest, "lobbyState", ({ lobby }) => lobby.maxPlayers === 3);
        const ownerSees = waitFor<LobbyUpdate>(owner, "lobbyState", ({ lobby }) => lobby.passphrase !== undefined);
        owner.emit("settings", pin, settings);
        const { lobby: forGuest } = await guestSees;
        expect(forGuest).toMatchObject({ hasPassphrase: true, disableChat: true, mythicMode: true });
        expect(forGuest.passphrase).toBeUndefined();
        const { passphrase } = (await ownerSees).lobby;
        expect(passphrase).toMatch(/^[♡♢♣♤]{4}$/);

        // Saving the settings again keeps the passphrase.
        const ownerSeesAgain = waitFor<LobbyUpdate>(owner, "lobbyState", ({ lobby }) => lobby.passphrase !== undefined);
        owner.emit("settings", pin, { ...settings, roundTimeout: 300 });
        expect((await ownerSeesAgain).lobby.passphrase).toBe(passphrase);

        // Turning the passphrase off lets players join without one.
        const passphraseOff = waitFor<LobbyUpdate>(guest, "lobbyState", ({ lobby }) => !lobby.hasPassphrase);
        owner.emit("settings", pin, { ...settings, passphrase: false });
        await passphraseOff;
        await trpc<Tokens>("lobbies.join", { pin, name: "late" });

        // The lobby can't shrink below the players in it, and only the owner can change it.
        const tooSmall = next<{ type: string; message?: string }>(owner, "error");
        owner.emit("settings", pin, { ...settings, maxPlayers: 2 });
        expect(await tooSmall).toMatchObject({
            type: "bad_request",
            message: "The lobby already has more players than that",
        });

        const notOwner = next<{ type: string }>(guest, "error");
        guest.emit("settings", pin, settings);
        expect((await notOwner).type).toBe("unauthorized");
    }, 30_000);
});
