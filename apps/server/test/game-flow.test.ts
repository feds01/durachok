/**
 * Plays a whole game through the server, as the web app would: a registered owner creates
 * a lobby, an anonymous player joins it, both connect over sockets, and they play until
 * one of them wins. It needs MongoDB, at `TEST_MONGODB_URI` or on localhost (`just db`),
 * and uses a database of its own, which it drops afterwards. Set `TEST_SERVER_LOG` to a
 * file to keep the server's logs.
 */
import { canForfeit, canPlace, gameResult, movesFor, turnOf } from "@durachok/engine";
import { LobbyClient, type PlayerGameState, type PlayerMove, type UserStatistics } from "@durachok/transport";
import type { Subprocess } from "bun";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import mongoose from "mongoose";
import { io, Socket } from "socket.io-client";

const MONGO = process.env.TEST_MONGODB_URI ?? "mongodb://localhost:27017";
const DB_URI = `${MONGO}/durachok-test-${crypto.randomUUID().slice(0, 8)}`;
const PORT = 20000 + Math.floor(Math.random() * 10000);
const BASE = `http://localhost:${PORT}`;

/**
 * Whether MongoDB answers. CI must have it, so waits for it to start there. It must be a
 * replica set, since the server changes lobbies in transactions.
 */
async function mongoAvailable(): Promise<boolean> {
    let connection: mongoose.Connection;
    try {
        connection = await mongoose
            .createConnection(MONGO, { serverSelectionTimeoutMS: process.env.CI ? 30_000 : 1000 })
            .asPromise();
    } catch {
        return false;
    }

    try {
        const hello = await connection.db?.admin().command({ hello: 1 });
        if (!hello?.setName) {
            throw new Error(`MongoDB at ${MONGO} isn't a replica set, which the server needs. Run \`just db\`.`);
        }
        return true;
    } finally {
        await connection.close();
    }
}

const available = await mongoAvailable();
if (!available && process.env.CI) {
    throw new Error(`MongoDB isn't reachable at ${MONGO}.`);
}

type Tokens = { token: string; refreshToken: string };

/** The keys that the server signs tokens with, which it won't start without, nor with one for both. */
const SECRETS = { JWT_SECRET_KEY: "test-access-secret", JWT_REFRESH_SECRET_KEY: "test-refresh-secret" };

/** An address of a client of its own, as the server's limits per address count them, @see TRUST_PROXY. */
function address(): string {
    return `10.${Array.from({ length: 3 }, () => Math.floor(Math.random() * 256)).join(".")}`;
}

/**
 * Call a tRPC procedure, as the web app's client does, from an address of its own unless one is
 * given, as each player's would be, so that the server's limits per address don't count the tests together.
 */
async function trpc<T>(
    path: string,
    input: unknown,
    tokens?: Tokens,
    method: "GET" | "POST" = "POST",
    from: string = address(),
): Promise<T> {
    const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": from };
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
        env: {
            ...process.env,
            ...SECRETS,
            PORT: String(PORT),
            MONGODB_URI: DB_URI,
            GAME_COUNTDOWN_MS: "0",
            NODE_ENV: "test",
            // The tests play at a machine's pace, far quicker than the limit for a person.
            SOCKET_EVENT_LIMIT: "100000",
        },
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
    // Stop the server before the sockets close, so that it doesn't start a transaction for
    // each of them as it stops, which MongoDB would hold open, and keep the database from
    // being dropped, until it expires.
    server?.kill();
    await server?.exited;
    sockets.forEach((socket) => socket.close());

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
        const statistics = async () =>
            (await trpc<{ statistics: UserStatistics }>("users.get", undefined, ownerTokens, "GET")).statistics;
        expect(await statistics()).toEqual({ gamesPlayed: 0, gamesWon: 0, gamesLost: 0 });

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
        const wrong = `${lobby.passphrase!.startsWith("♡") ? "♢" : "♡"}${lobby.passphrase!.slice(1)}`;
        await expect(trpc("lobbies.join", { pin, name: "guest", passphrase: wrong })).rejects.toThrow("401");
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
        const versions = new Map<Socket, number[]>();
        for (const { socket } of players) {
            socket.on("action", ({ update, version }: { update: PlayerGameState; version: number }) => {
                states.set(socket, update);
                actionCounts.set(socket, (actionCounts.get(socket) ?? 0) + 1);
                versions.set(socket, [...(versions.get(socket) ?? []), version]);
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

        for (let moves = 0, idle = 0; moves < 500;) {
            if (victory) break;
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
        expect(victory!.players.map((p) => p.name).toSorted()).toEqual(players.map((p) => p.name).toSorted());

        expect(players.map(({ socket }) => gameOver.get(socket))).toEqual(players.map(() => "waiting"));

        // Each move took the game's version up by one, from the deal's.
        for (const { socket } of players) {
            const seen = versions.get(socket)!;
            expect(seen).toEqual(seen.map((_, i) => seen[0]! + i));
        }

        // The lobby waits for another game, with both players still in it.
        const after = await trpc<{ status: string; players: unknown[] }>("lobbies.get", { pin }, ownerTokens, "GET");
        expect(after.status).toBe("waiting");
        expect(after.players).toHaveLength(2);

        // The game counts in the owner's statistics, as the guest has no account to count it in.
        const { winners, durak } = gameResult(victory!.players);
        expect(await statistics()).toEqual({
            gamesPlayed: 1,
            gamesWon: winners.includes(`owner-${id}`) ? 1 : 0,
            gamesLost: durak === `owner-${id}` ? 1 : 0,
        });
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

/** Register an owner, and create a lobby of theirs with a short deck. */
async function createLobby(prefix: string, maxPlayers: number) {
    const name = `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
    const tokens = await trpc<Tokens>("auth.register", {
        name,
        email: `${name}@example.com`,
        password: "Password123!",
        reCaptchaToken: "test",
    });
    const { pin } = await trpc<{ pin: string }>(
        "lobbies.create",
        { settings: { maxPlayers, passphrase: false, shortGameDeck: true, roundTimeout: 120 } },
        tokens,
    );
    return { pin, tokens };
}

/** Connect a player to a lobby, resolving once the server has sent them the lobby. */
async function enter(pin: string, tokens: Tokens): Promise<Socket> {
    const socket = await connect(tokens);
    sockets.push(socket);
    const joined = next(socket, "join");
    socket.emit("join", pin);
    await joined;
    return socket;
}

/** Join a lobby as an anonymous player, and connect to it. */
async function joinAs(pin: string, name: string): Promise<Socket> {
    return enter(pin, await trpc<Tokens>("lobbies.join", { pin, name }));
}

type StoredPlayer = { name: string; socket: string | null };

/** Read a lobby's players and status, and its game's players, as the database has them. */
async function stored(pin: string) {
    const connection = await mongoose.createConnection(DB_URI).asPromise();
    try {
        const lobby = await connection.collection("lobbies").findOne({ pin });
        // A lobby's game has the lobby's id.
        const game = lobby && (await connection.collection("games").findOne({ _id: lobby._id }));
        return {
            status: lobby?.status as string | undefined,
            players: (lobby?.players ?? []) as StoredPlayer[],
            inGame: Object.keys(game?.state?.players ?? {}).toSorted(),
        };
    } finally {
        await connection.close();
    }
}

const names = (players: StoredPlayer[]) => players.map((p) => p.name).toSorted();

/**
 * Players who do things at the same time, which the server takes one at a time: each
 * test races requests, and checks that the lobby comes out right whichever wins.
 */
describe.skipIf(!available)("Players at the same time", () => {
    /**
     * How long after the first request the second is sent, in a lobby of its own for each,
     * so that the second lands at each step of the first, wherever its checks and writes are.
     */
    const DELAYS = [0, 1, 2, 4, 8];

    test("players who join at once can't share a name, or take more places than there are", async () => {
        const { pin } = await createLobby("crowd", 3);

        // Many players ask for the same name at once, and only one of them gets it.
        const twins = await Promise.allSettled(
            Array.from({ length: 30 }, () => trpc<Tokens>("lobbies.join", { pin, name: "twin" })),
        );
        expect(twins.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
        for (const result of twins) {
            if (result.status === "rejected") expect(String(result.reason)).toContain("User already in lobby");
        }

        // One place is left, and only one of the players who ask for it gets it.
        const others = await Promise.allSettled(
            Array.from({ length: 10 }, (_, i) => trpc<Tokens>("lobbies.join", { pin, name: `p${i}` })),
        );
        expect(others.filter(({ status }) => status === "fulfilled")).toHaveLength(1);

        const { players } = await stored(pin);
        expect(players).toHaveLength(3);
        expect(new Set(names(players)).size).toBe(3);
    }, 15_000);

    test("a player kicked as the game starts is in the game, or out of the lobby, as they were told", async () => {
        await Promise.all(
            DELAYS.map(async (delay) => {
                const { pin, tokens } = await createLobby("kicker", 3);
                const owner = await enter(pin, tokens);
                const kicked = await joinAs(pin, "a");
                await joinAs(pin, "b");

                // The player hears that they were kicked, or the owner that they couldn't kick them.
                const outcome = new Promise<"kicked" | "refused">((resolve) => {
                    kicked.once("close", () => resolve("kicked"));
                    owner.once("error", () => resolve("refused"));
                });
                const dealt = next(owner, "action");
                owner.emit("kick", pin, { name: "a" });
                await Bun.sleep(delay);
                owner.emit("start", pin);
                await dealt;

                const wasKicked = (await outcome) === "kicked";
                const { status, players, inGame } = await stored(pin);
                expect(status).toBe("playing");
                expect(inGame).toEqual(names(players));
                expect(inGame.includes("a")).toBe(!wasKicked);
            }),
        );
    }, 20_000);

    test("a player who leaves as the game starts doesn't keep a connection that's gone", async () => {
        await Promise.all(
            DELAYS.map(async (delay) => {
                const { pin, tokens } = await createLobby("leaver", 3);
                const owner = await enter(pin, tokens);
                await joinAs(pin, "a");
                const leaver = await joinAs(pin, "b");

                const dealt = next(owner, "action");
                owner.emit("start", pin);
                await Bun.sleep(delay);
                leaver.close();
                await dealt;

                // Leaving before the game starts gives up the place, and after keeps it, without
                // a connection, so that they can rejoin.
                let lobby = await stored(pin);
                for (let attempt = 0; lobby.players.some((p) => p.name === "b" && p.socket !== null); attempt++) {
                    if (attempt > 50) {
                        throw new Error(`b kept a connection that closed: ${JSON.stringify(lobby.players)}`);
                    }
                    await Bun.sleep(20);
                    lobby = await stored(pin);
                }
                expect(lobby.inGame).toEqual(names(lobby.players));
            }),
        );
    }, 20_000);

    test("a move sent twice at once is made once", async () => {
        const { pin, tokens } = await createLobby("twice", 2);
        const owner = await enter(pin, tokens);
        const guest = await joinAs(pin, "guest");

        type ActionMessage = { update: PlayerGameState; version: number };
        const received = new Map<Socket, ActionMessage[]>([
            [owner, []],
            [guest, []],
        ]);
        for (const [socket, messages] of received) {
            socket.on("action", (message: ActionMessage) => messages.push(message));
        }

        const dealt = Promise.all([owner, guest].map((socket) => next(socket, "action")));
        owner.emit("start", pin);
        await dealt;

        // The player who leads the round places a card, twice.
        const [leader, { update, version }] = [...received]
            .map(([socket, messages]) => [socket, messages.at(-1)!] as const)
            .find(([, last]) => turnOf(last.update).kind === "lead")!;
        const card = update.player.deck.find((held) => canPlace(update, held))!;

        const refused = next<{ type: string }>(leader, "error");
        leader.emit("move", pin, { type: "place", card });
        leader.emit("move", pin, { type: "place", card });
        expect((await refused).type).toBe("invalid_move");
        await Bun.sleep(100);

        // Everyone saw the deal, and then the move once, which took the game's version up by one.
        for (const messages of received.values()) {
            expect(messages.map((message) => message.version)).toEqual([version, version + 1]);
        }
    }, 15_000);
});

/** Keep the server's registry of bots, as `just bots` does, and return what it printed. */
function bots(...args: string[]): string {
    const result = Bun.spawnSync(["bun", "src/scripts/bot.ts", ...args], {
        cwd: `${import.meta.dir}/..`,
        env: { ...process.env, ...SECRETS, MONGODB_URI: DB_URI },
    });
    return result.stdout.toString();
}

/** Add a bot to the server's registry, and return its tokens. */
function registerBot(name: string): Tokens {
    const output = bots("add", name, "A bot that plays in the tests");
    const token = /^BOT_TOKEN=(.+)$/m.exec(output)?.[1];
    const refreshToken = /^BOT_REFRESH_TOKEN=(.+)$/m.exec(output)?.[1];
    if (!token || !refreshToken) {
        throw new Error(`Couldn't add the bot: ${output}`);
    }
    return { token, refreshToken };
}

/** Bots, which the server knows from its registry, and which play through the lobby protocol like anyone else. */
describe.skipIf(!available)("Bots", () => {
    test("a bot from the registry joins a lobby under its name, and plays through the lobby client", async () => {
        // A place to spare, so that the bot's second try at a seat isn't turned away for a full lobby.
        const { pin, tokens } = await createLobby("host", 3);
        const owner = await enter(pin, tokens);
        const name = `bot-${crypto.randomUUID().slice(0, 8)}`;
        const botTokens = registerBot(name);

        // A bot plays under its name in the registry, so it doesn't choose one, and has one seat.
        expect(await trpc("lobbies.join", { pin }, botTokens)).toEqual({});
        await expect(trpc("lobbies.join", { pin }, botTokens)).rejects.toThrow("User already in lobby");

        type LobbyUpdate = { lobby: { players: { name: string; bot?: boolean }[] } };
        const ownerSeesBot = waitFor<LobbyUpdate>(owner, "lobbyState", ({ lobby }) =>
            lobby.players.some((player) => player.name === name),
        );
        const bot = await enter(pin, botTokens);
        const { lobby } = await ownerSeesBot;
        expect(lobby.players.find((player) => player.name === name)?.bot).toBe(true);

        // The bot is dealt in, and makes its moves as a person's client would.
        const dealt = Promise.all([owner, bot].map((socket) => next<{ update: PlayerGameState }>(socket, "action")));
        owner.emit("start", pin);
        const [ownerView, botView] = (await dealt).map(({ update }) => update) as [PlayerGameState, PlayerGameState];
        const client = new LobbyClient(bot, pin);
        const botMoved = waitFor<{ actions: { player?: string }[] }>(owner, "action", ({ actions }) =>
            actions.some((action) => action.player === name),
        );

        if (turnOf(botView).kind === "lead") {
            client.move({ type: "place", card: botView.player.deck.find((card) => canPlace(botView, card))! });
        } else {
            // The owner leads, and the bot, which defends, takes the card.
            const attacked = next(bot, "action");
            owner.emit("move", pin, {
                type: "place",
                card: ownerView.player.deck.find((card) => canPlace(ownerView, card))!,
            });
            await attacked;
            client.move({ type: "forfeit" });
        }
        await botMoved;
    }, 15_000);

    test("the server shuts out a bot once it is no longer in the registry", async () => {
        const name = `gone-${crypto.randomUUID().slice(0, 8)}`;
        const botTokens = registerBot(name);
        expect(bots("remove", name)).toContain(`Removed ${name}`);

        await expect(connect(botTokens)).rejects.toThrow("unauthorized");

        // Without its tokens, the bot is a player without an account, who needs a name to join.
        const { pin } = await createLobby("host", 2);
        await expect(trpc("lobbies.join", { pin }, botTokens)).rejects.toThrow("needs a name");
    }, 15_000);
});

/** Register an account, and return its tokens. */
async function register(prefix: string): Promise<Tokens> {
    const name = `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
    return trpc<Tokens>("auth.register", {
        name,
        email: `${name}@example.com`,
        password: "Password123!",
        reCaptchaToken: "test",
    });
}

/** The ways that a client could abuse the lobby, which the server shuts. */
describe.skipIf(!available)("Abuse", () => {
    test("an old token for a name can't take the place of the next player with that name", async () => {
        const { pin } = await createLobby("seat", 4);
        const first = await trpc<Tokens>("lobbies.join", { pin, name: "bob" });
        const socket = await enter(pin, first);

        // Bob leaves, and somebody else joins under his name.
        socket.emit("leave", pin);
        for (let i = 0; i < 100 && names((await stored(pin)).players).includes("bob"); i++) {
            await Bun.sleep(20);
        }
        const second = await trpc<Tokens>("lobbies.join", { pin, name: "bob" });

        await expect(trpc("lobbies.get", { pin }, first, "GET")).rejects.toThrow("401");
        expect(await trpc<{ pin: string }>("lobbies.get", { pin }, second, "GET")).toMatchObject({ pin });
    });

    test("a player whom the owner kicked out can't join again", async () => {
        const { pin, tokens } = await createLobby("kick", 4);
        const owner = await enter(pin, tokens);
        const eve = await joinAs(pin, "eve");

        const kicked = next(eve, "close");
        const cut = next(eve, "disconnect");
        owner.emit("kick", pin, { name: "eve" });
        expect(await kicked).toEqual({ reason: "kicked" });

        // Her connection closes too, after she was told why, and her socket doesn't reconnect.
        expect(await cut).toBe("io server disconnect");
        expect(eve.active).toBe(false);

        await expect(trpc("lobbies.join", { pin, name: "eve" })).rejects.toThrow("kicked you out");
    });

    test("a passphrase can't be guessed, from one address or from many", async () => {
        const tokens = await register("guarded");
        const { pin } = await trpc<{ pin: string }>(
            "lobbies.create",
            { settings: { maxPlayers: 8, passphrase: true, shortGameDeck: false, roundTimeout: 120 } },
            tokens,
        );
        const owner = await connect(tokens);
        sockets.push(owner);
        const joined = next<{ lobby: { passphrase: string } }>(owner, "join");
        owner.emit("join", pin);
        const { passphrase } = (await joined).lobby;
        const wrong = `${passphrase.startsWith("♡") ? "♢" : "♡"}${passphrase.slice(1)}`;

        // One address fails to join only so often, and then can't join even with the passphrase.
        const from = address();
        for (let i = 0; i < 10; i++) {
            await expect(
                trpc("lobbies.join", { pin, name: `one-${i}`, passphrase: wrong }, undefined, "POST", from),
            ).rejects.toThrow("401");
        }
        await expect(trpc("lobbies.join", { pin, name: "one", passphrase }, undefined, "POST", from)).rejects.toThrow(
            "429",
        );

        // Many addresses together send the lobby only so many wrong passphrases.
        for (let i = 0; i < 10; i++) {
            await expect(trpc("lobbies.join", { pin, name: `many-${i}`, passphrase: wrong })).rejects.toThrow("401");
        }
        await expect(trpc("lobbies.join", { pin, name: "late", passphrase })).rejects.toThrow("429");
    });

    test("a player can't flood the chat", async () => {
        const { pin, tokens } = await createLobby("chatty", 2);
        const owner = await enter(pin, tokens);

        const refused = waitFor<{ type: string }>(owner, "error", ({ type }) => type === "too_many_requests");
        for (let i = 0; i < 6; i++) {
            owner.emit("message", pin, { message: `hello ${i}` });
        }
        await refused;
    });

    test("a deleted account's tokens stop working at once", async () => {
        const tokens = await register("gone");
        await trpc("users.delete", undefined, tokens);

        await expect(connect(tokens)).rejects.toThrow("unauthorized");
        await expect(
            trpc("lobbies.create", { settings: { maxPlayers: 2, roundTimeout: 120 } }, tokens),
        ).rejects.toThrow("401");

        // Nor does its refresh token make new ones, as it would for an access token that expired.
        const refreshOnly = { token: "", refreshToken: tokens.refreshToken };
        await expect(connect(refreshOnly)).rejects.toThrow("unauthorized");
        await expect(trpc("auth.refresh", undefined, refreshOnly)).rejects.toThrow("401");
    });
});

/**
 * Play a game to its end, each player making the first move that they can, and close the connection
 * of each player who goes out while the game goes on without them.
 *
 * @returns The names of the players who left before the game ended.
 */
async function playWhileThoseOutLeave(pin: string, players: Socket[]): Promise<string[]> {
    const views = new Map<Socket, { view: PlayerGameState; version: number }>();
    const waiting = new Set<Socket>();
    const tried = new Map<Socket, string[]>();
    const left: string[] = [];
    let over = false;

    for (const socket of players) {
        const take = ({ update, version }: { update: PlayerGameState; version: number }) => {
            const known = views.get(socket);
            if (known && version <= known.version) return;
            views.set(socket, { view: update, version });
            waiting.delete(socket);
            tried.delete(socket);
        };
        socket.on("action", take).on("playerState", take);
        socket.on("error", ({ type }: { type: string }) => type === "invalid_move" && waiting.delete(socket));
        socket.on("victory", () => (over = true));
    }
    players[0]!.emit("start", pin);

    for (const deadline = Date.now() + 30_000; Date.now() < deadline; await Bun.sleep(10)) {
        if (over) break;
        for (const socket of players) {
            const known = views.get(socket);
            if (!known || !socket.connected || waiting.has(socket)) continue;

            const { view } = known;
            if (view.player.out !== null) {
                if (view.players.filter(({ out }) => out === null).length >= 2) {
                    left.push(view.player.name);
                    socket.close();
                }
                continue;
            }
            if (turnOf(view).kind === "attackDone") continue;

            const moves: PlayerMove[] = [
                ...view.player.deck.flatMap((card) => movesFor(view, card)),
                ...(canForfeit(view) ? [{ type: "forfeit" as const }] : []),
            ];
            const move = moves.find((candidate) => !(tried.get(socket) ?? []).includes(JSON.stringify(candidate)));
            if (!move) continue;

            tried.set(socket, [...(tried.get(socket) ?? []), JSON.stringify(move)]);
            waiting.add(socket);
            socket.emit("move", pin, move);
        }
    }

    for (let i = 0; i < 100 && (await stored(pin)).status !== "waiting"; i++) {
        await Bun.sleep(20);
    }
    return left;
}

describe.skipIf(!available)("The end of a game", () => {
    test("a player who left during it gives up their place, and the owner keeps theirs", async () => {
        // Who goes out first is up to the deal, so games are played until one has a player
        // other than the owner leave it while it goes on.
        for (let attempt = 0; attempt < 10; attempt++) {
            const { pin, tokens } = await createLobby("leaver", 3);
            const owner = await enter(pin, tokens);
            const ownerName = (await stored(pin)).players[0]!.name;
            const left = await playWhileThoseOutLeave(pin, [owner, await joinAs(pin, "ana"), await joinAs(pin, "bo")]);
            const guestsWhoLeft = left.filter((name) => name !== ownerName);
            if (guestsWhoLeft.length === 0) continue;

            const { status, players } = await stored(pin);
            expect(status).toBe("waiting");
            expect(names(players)).toContain(ownerName);
            for (const name of guestsWhoLeft) {
                expect(names(players)).not.toContain(name);
            }
            return;
        }
        throw new Error("No game had a player other than the owner leave it while it went on");
    }, 120_000);
});
