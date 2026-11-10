/**
 * Counting a finished game in its registered players' statistics, against MongoDB, at
 * `TEST_MONGODB_URI` or on localhost (`just db`), in a database of its own, which it drops
 * afterwards. The documents are written as the server left them, and read through its services.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import mongoose from "mongoose";

import { available, dropDatabase, testDatabaseUri } from "./database";

const DB_URI = testDatabaseUri();

// The config reads where the database is as it loads, so it's set before the server's modules are.
process.env.MONGODB_URI = DB_URI;
const { openDatabase, closeDatabase } = await import("../src/lib/database");
const { createContext } = await import("../src/interface/context");
const { default: logger } = await import("../src/lib/logger");

const { lobbyService, userService, gameService } = createContext(logger);

beforeAll(async () => {
    if (available) {
        await openDatabase();
    }
});

afterAll(async () => {
    if (available) {
        await closeDatabase();
        await dropDatabase(DB_URI);
    }
});

/** A registered account, as one from before the server kept statistics, which has none. */
async function account(name: string): Promise<string> {
    const { insertedId } = await mongoose.connection
        .collection("users")
        .insertOne({ name, email: `${name}@example.com`, password: "a-long-password", image: false });
    return insertedId.toString();
}

/** A player's part in the stored game: when they went out, if they did. */
function player(name: string, out: number | null) {
    return { name, out, deck: out === null ? ["6H"] : [], action: "none", beganRound: false, turned: false };
}

/** A user's statistics, as their dashboard is sent them. */
async function statisticsOf(id: string) {
    return (await userService.get(id)).statistics;
}

describe.skipIf(!available)("A finished game", () => {
    test("counts once in each registered player's statistics: played, won, lost, hosted and its rounds", async () => {
        const [anna, boris] = await Promise.all([account("anna"), account("boris")]);
        const lobby = new mongoose.Types.ObjectId();
        await mongoose.connection.collection("lobbies").insertOne({
            _id: lobby,
            __v: 0,
            pin: "123456",
            createdAt: new Date(),
            status: "playing",
            maxPlayers: 3,
            shortGameDeck: false,
            freeForAll: true,
            disableChat: false,
            randomisePlayerOrder: false,
            roundTimeout: 120,
            mythicMode: false,
            owner: new mongoose.Types.ObjectId(anna),
            game: lobby,
            version: 0,
            chat: [],
            kicked: [],
            players: [
                { name: "anna", confirmed: true, registered: anna, socket: "a" },
                { name: "boris", confirmed: true, registered: boris, socket: "b" },
                { name: "guest", confirmed: true, seat: "s", socket: "g" },
            ],
        });
        // A lobby's game is kept under the lobby's id.
        await mongoose.connection.collection("games").insertOne({
            _id: lobby,
            version: 0,
            // Three rounds: the first, which starts the game, and two more.
            history: {
                nodes: [
                    { type: "start", actors: { attacker: "anna", defender: "boris" } },
                    { type: "new_round", actors: { attacker: "boris", defender: "guest" } },
                    { type: "new_round", actors: { attacker: "guest", defender: "anna" } },
                    { type: "victory" },
                ],
            },
            state: {
                status: "finished",
                trump: { suit: "H", card: "AH" },
                deck: [],
                tableTop: {},
                players: { anna: player("anna", 100), boris: player("boris", null), guest: player("guest", 200) },
            },
        });

        // The move that finished the game and a retry of it both finish the lobby, but it counts once.
        await lobbyService.finishGame("123456");
        await lobbyService.finishGame("123456");

        // anna owns the lobby, so she hosted it.
        expect(await statisticsOf(anna)).toEqual({
            gamesPlayed: 1,
            gamesWon: 1,
            gamesLost: 0,
            gamesHosted: 1,
            gamesResigned: 0,
            averageRounds: 3,
        });
        expect(await statisticsOf(boris)).toEqual({
            gamesPlayed: 1,
            gamesWon: 0,
            gamesLost: 1,
            gamesHosted: 0,
            gamesResigned: 0,
            averageRounds: 3,
        });
        expect((await lobbyService.get("123456")).status).toBe("waiting");
    });

    test("leaves an account from before statistics were kept with none", async () => {
        expect(await statisticsOf(await account("clara"))).toEqual({
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesHosted: 0,
            gamesResigned: 0,
            averageRounds: 0,
        });
    });
});

describe.skipIf(!available)("A game that the owner removes a registered player from", () => {
    test("counts in that player's statistics as resigned, and in nobody else's yet", async () => {
        const [anya, cleo] = await Promise.all([account("anya"), account("cleo")]);
        const lobby = new mongoose.Types.ObjectId();
        await mongoose.connection.collection("lobbies").insertOne({
            _id: lobby,
            __v: 0,
            pin: "654321",
            createdAt: new Date(),
            status: "playing",
            maxPlayers: 3,
            shortGameDeck: false,
            freeForAll: true,
            disableChat: false,
            randomisePlayerOrder: false,
            roundTimeout: 120,
            mythicMode: false,
            allowSpectators: false,
            owner: new mongoose.Types.ObjectId(anya),
            game: lobby,
            version: 0,
            chat: [],
            kicked: [],
            players: [
                { name: "anya", confirmed: true, registered: anya, socket: "a" },
                { name: "cleo", confirmed: true, registered: cleo, socket: "c" },
                { name: "guest", confirmed: true, seat: "s", socket: "g" },
            ],
        });
        // anya attacks the guest, and cleo waits for her turn, with cards still in the deck.
        const hand = (suit: string) => ["6", "7", "8", "9", "10", "J"].map((rank) => `${rank}${suit}`);
        await mongoose.connection.collection("games").insertOne({
            _id: lobby,
            version: 0,
            history: { nodes: [{ type: "start", actors: { attacker: "anya", defender: "guest" } }] },
            state: {
                status: "playing",
                trump: { suit: "H", card: "6H" },
                deck: ["QS", "KS", "AS", "QD", "KD", "AD", "QC", "KC", "AC", "6H"],
                tableTop: {},
                players: {
                    anya: {
                        name: "anya",
                        deck: hand("S"),
                        action: "attack",
                        beganRound: true,
                        out: null,
                        turned: false,
                    },
                    cleo: {
                        name: "cleo",
                        deck: hand("D"),
                        action: "none",
                        beganRound: false,
                        out: null,
                        turned: false,
                    },
                    guest: {
                        name: "guest",
                        deck: hand("C"),
                        action: "defend",
                        beganRound: false,
                        out: null,
                        turned: false,
                    },
                },
            },
        });

        await lobbyService.kick("654321", "cleo", gameService(await lobbyService.get("654321")));

        expect(await statisticsOf(cleo)).toEqual({
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesHosted: 0,
            gamesResigned: 1,
            averageRounds: 0,
        });
        // The game goes on without her, so it isn't counted for anybody else until it ends.
        expect((await statisticsOf(anya)).gamesPlayed).toBe(0);
        expect((await lobbyService.get("654321")).status).toBe("playing");
    });
});
