import { DEFAULT_SETTINGS } from "@durachok/engine";
import { ClientSocket, LobbyClient, PlayerGameState, PlayerMove } from "@durachok/transport";
import { describe, expect, test } from "bun:test";

import { observe } from "./observation";
import { BotPlayer } from "./player";
import { playGame, tournament } from "./selfplay";
import { Strategy } from "./strategy";

/** A view of the start of a round, which the bot leads, with hearts as trumps. */
const leading: PlayerGameState = {
    player: { name: "bot", deck: ["6S", "7D"], out: null, turned: false, beganRound: true, action: "attack" },
    players: [
        {
            name: "other",
            deck: { type: "hidden", size: 6 },
            out: null,
            turned: false,
            beganRound: false,
            action: "defend",
        },
    ],
    tableTop: {},
    deckSize: 20,
    discardSize: 4,
    trump: { suit: "H", card: "AH", value: 14 },
};

/** The view after the bot led with the six of spades, when it can't add anything else. */
const led: PlayerGameState = { ...leading, player: { ...leading.player, deck: ["7D"] }, tableTop: { "6S": null } };

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

    public receive(event: string, ...args: unknown[]) {
        this.listeners.get(event)?.forEach((listener) => listener(...args));
    }

    /** The moves that the bot made. */
    public get moves() {
        return this.sent.filter(([event]) => event === "move").map(([, , move]) => move);
    }
}

/** A strategy that makes the first move that it can, and remembers what it was shown. */
class FirstMove implements Strategy {
    public shown: PlayerGameState[] = [];

    public decide({ view, moves }: { view: PlayerGameState; moves: PlayerMove[] }): PlayerMove {
        this.shown.push(view);
        return moves[0]!;
    }
}

function seat(thinkMs = 0) {
    const socket = new FakeSocket();
    const strategy = new FirstMove();
    const bot = new BotPlayer(new LobbyClient(socket, "123456"), { strategy, thinkMs: () => thinkMs });
    return { socket, strategy, bot };
}

describe("What a bot observes", () => {
    test("the table, the deck, and the moves that it can make", () => {
        const observation = observe(led, []);

        expect(observation.table).toEqual([{ card: "6S", coveredBy: null }]);
        expect(observation.deck).toEqual({ size: 20, discarded: 4 });
        expect(observation.moves).toEqual([{ type: "forfeit" }]);
    });

    test("nothing about the deck in mythic mode, and no move that the game refused", () => {
        const observation = observe(
            { ...leading, deckSize: null, discardSize: null },
            [],
            [{ type: "place", card: "6S" }],
        );

        expect(observation.deck).toBeNull();
        expect(observation.moves).toEqual([{ type: "place", card: "7D" }]);
    });

    test("no move to make once it said that it's done attacking, though it could still add a card", () => {
        const done = { ...led, player: { ...led.player, deck: ["6H"], turned: true } };

        expect(observe(done, []).moves).toEqual([]);
    });
});

describe("A bot player", () => {
    test("makes a move when it can, and waits for the server's answer before the next", async () => {
        const { socket, bot } = seat();

        socket.receive("action", { actions: [], update: leading, version: 1 });
        socket.receive("action", { actions: [], update: leading, version: 1 });
        await Bun.sleep(5);
        expect(socket.moves).toEqual([{ type: "place", card: "6S" }]);

        // Another player's move isn't the answer to the bot's.
        socket.receive("action", {
            actions: [{ type: "place", card: "6D", player: "other" }],
            update: leading,
            version: 2,
        });
        await Bun.sleep(5);
        expect(socket.moves).toHaveLength(1);

        socket.receive("action", { actions: [{ type: "place", card: "6S", player: "bot" }], update: led, version: 3 });
        await Bun.sleep(5);
        expect(socket.moves).toEqual([{ type: "place", card: "6S" }, { type: "forfeit" }]);
        bot.stop();
    });

    test("doesn't make a move again that the server refused", async () => {
        const { socket, bot } = seat();

        socket.receive("action", { actions: [], update: leading, version: 1 });
        await Bun.sleep(5);
        socket.receive("error", { type: "invalid_move", message: "No" });
        socket.receive("playerState", { update: leading, version: 1 });
        await Bun.sleep(5);

        expect(socket.moves).toEqual([
            { type: "place", card: "6S" },
            { type: "place", card: "7D" },
        ]);
        bot.stop();
    });

    test("leaves out an update that arrives after a newer one, and decides on the newest", async () => {
        const { socket, strategy, bot } = seat(20);

        socket.receive("action", { actions: [], update: leading, version: 2 });
        socket.receive("action", { actions: [], update: led, version: 3 });
        socket.receive("action", { actions: [], update: leading, version: 1 });
        await Bun.sleep(40);

        expect(strategy.shown).toEqual([led]);
        expect(socket.moves).toEqual([{ type: "forfeit" }]);
        bot.stop();
    });
});

describe("Self-play", () => {
    test("plays a whole game between strategies, until at most one of them holds cards", async () => {
        const strategies = { a: new FirstMove(), b: new FirstMove(), c: new FirstMove() };
        const { order, durak } = await playGame(strategies, { ...DEFAULT_SETTINGS, shortGameDeck: true });

        // The last two players can go out at once, and then nobody is the durak.
        expect([...order, ...(durak ? [durak] : [])].toSorted()).toEqual(["a", "b", "c"]);
    });

    test("counts how many games each strategy lost", async () => {
        const losses = await tournament({ a: new FirstMove(), b: new FirstMove() }, 5);

        expect(Object.keys(losses)).toEqual(["a", "b"]);
        expect(losses.a! + losses.b!).toBeLessThanOrEqual(5);
    });
});
