import { Action, LobbyClient, PlayerGameState, PlayerMove, isDef, isMoveBy } from "@durachok/transport";

import { Observation, observe } from "./observation";
import { Strategy } from "./strategy";

export interface BotPlayerOptions {
    /** How the bot decides its moves. */
    strategy: Strategy;
    /** How long the bot thinks before each move, in milliseconds, so that people can follow it. */
    thinkMs?: () => number;
    /** How long to wait for the server to answer a move before deciding again, in milliseconds. */
    answerTimeoutMs?: number;
    /** Hears why the strategy failed to decide a move. */
    onError?: (error: unknown) => void;
}

/** A person's pace, between half a second and a second and a half. */
const humanPace = () => 500 + Math.random() * 1000;

/**
 * Plays a player's seat in a lobby through its client, as a person does through the web app:
 * it follows the updates that the player is sent, and whenever they can make a move, asks
 * its strategy which, and makes it. It makes one move at a time, and waits for the server
 * to answer it before it decides the next.
 */
export class BotPlayer {
    /** The player's newest view of the game, or none between games. */
    private view: PlayerGameState | null = null;
    /**
     * What the bot has seen happen in this game, which it keeps itself, since each update of the
     * game brings only what happened in it. Its strategy is shown it to decide.
     */
    private history: Action[] = [];
    /** The moves that the server refused since the game last changed, which the bot doesn't make again. */
    private refused: PlayerMove[] = [];
    /** The move that the bot made, until the server answers it. */
    private pending: { move: PlayerMove; timer: ReturnType<typeof setTimeout> } | null = null;
    /** The decision that the bot is making, which a newer update of the game calls off. */
    private thinking: AbortController | null = null;
    /** Stop listening to the client, once the bot stops playing. */
    private readonly unsubscribe: (() => void)[];

    public constructor(
        private readonly client: LobbyClient,
        private readonly options: BotPlayerOptions,
    ) {
        // The client hands on only updates of the game that are newer than the last.
        this.unsubscribe = [
            // A bot plays, so it's sent the game as a player sees it.
            client.on("join", (joined) => {
                if (joined.as === "player" && isDef(joined.game)) {
                    this.follow(joined.game, []);
                }
            }),
            client.on("action", ({ update, actions }) => this.follow(update, actions)),
            client.on("playerState", ({ update }) => this.follow(update)),
            client.on("error", ({ type }) => {
                this.answered(type === "invalid_move");
                this.consider();
            }),
            client.on("victory", () => this.reset()),
        ];
    }

    /** Stop playing: call off the decision under way, stop waiting for an answer, and stop listening. */
    public stop(): void {
        this.thinking?.abort();
        if (this.pending) {
            clearTimeout(this.pending.timer);
        }
        this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    }

    /**
     * Follow the game to a newer view of it.
     *
     * @param actions - What happened since the last view, when the game changed: none when the
     * bot joins, as the server only sends the game as it is then, and nothing when the server
     * sends the same game again, after refusing a move.
     */
    private follow(view: PlayerGameState, actions?: Action[]): void {
        if (isDef(actions)) {
            this.refused = [];
            this.history.push(...actions);
            if (actions.some((action) => isMoveBy(action, view.player.name))) {
                this.answered(false);
            }
        }

        this.view = view;
        this.consider();
    }

    /** The server answered the bot's move: it took it, or refused it, and then the bot doesn't make it again. */
    private answered(refused: boolean): void {
        if (!this.pending) {
            return;
        }

        clearTimeout(this.pending.timer);
        if (refused) {
            this.refused.push(this.pending.move);
        }
        this.pending = null;
    }

    /** Forget the game, which finished. */
    private reset(): void {
        this.thinking?.abort();
        if (this.pending) {
            clearTimeout(this.pending.timer);
            this.pending = null;
        }
        this.view = null;
        this.history = [];
        this.refused = [];
    }

    /** Decide a move, if the player can make one, and isn't waiting for the answer to their last. */
    private consider(): void {
        this.thinking?.abort();
        this.thinking = null;
        if (!this.view || this.pending) {
            return;
        }

        const observation = observe(this.view, [...this.history], this.refused);
        if (observation.moves.length === 0) {
            return;
        }

        const thinking = new AbortController();
        this.thinking = thinking;
        setTimeout(() => void this.decide(observation, thinking.signal), (this.options.thinkMs ?? humanPace)());
    }

    /** Ask the strategy for a move, and make it, unless a newer update of the game called the decision off. */
    private async decide(observation: Observation, signal: AbortSignal): Promise<void> {
        if (signal.aborted) {
            return;
        }

        try {
            const move = await this.options.strategy.decide(observation, signal);
            if (!signal.aborted) {
                this.make(move);
            }
        } catch (error: unknown) {
            if (!signal.aborted) {
                this.options.onError?.(error);
            }
        }
    }

    /** Send a move, and wait for the server to answer it. */
    private make(move: PlayerMove): void {
        this.thinking = null;

        // If the answer never comes, e.g. because the connection dropped, decide again.
        const timer = setTimeout(() => {
            this.pending = null;
            this.consider();
        }, this.options.answerTimeoutMs ?? 10_000);

        this.pending = { move, timer };
        this.client.move(move);
    }
}
