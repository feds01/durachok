import { Action, LobbyClient, PlayerGameState, PlayerMove, isMoveBy } from "@durachok/transport";

import { Observation, observe } from "./observation";
import { Strategy } from "./strategy";
import { isDef } from "./utils";

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
    private view: PlayerGameState | null = null;
    /** The version of the game that the view shows, @see ActionMessageSchema. */
    private version = -1;
    private history: Action[] = [];
    /** The moves that the server refused since the game last changed, which the bot doesn't make again. */
    private refused: PlayerMove[] = [];
    /** The move that the bot made, until the server answers it. */
    private pending: { move: PlayerMove; timer: ReturnType<typeof setTimeout> } | null = null;
    /** The decision that the bot is making, which a newer update of the game calls off. */
    private thinking: AbortController | null = null;
    private readonly unsubscribe: (() => void)[];

    public constructor(
        private readonly client: LobbyClient,
        private readonly options: BotPlayerOptions,
    ) {
        this.unsubscribe = [
            client.on("join", ({ game, gameVersion }) => {
                if (isDef(game) && isDef(gameVersion)) {
                    this.update(game, gameVersion, []);
                }
            }),
            client.on("action", ({ update, version, actions }) => this.update(update, version, actions)),
            client.on("playerState", ({ update, version }) => this.update(update, version, [])),
            client.on("error", ({ type }) => {
                this.answered(type === "invalid_move");
                this.consider();
            }),
            client.on("victory", () => this.reset()),
        ];
    }

    /** Stop playing. */
    public stop(): void {
        this.thinking?.abort();
        if (this.pending) {
            clearTimeout(this.pending.timer);
        }
        this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    }

    private update(view: PlayerGameState, version: number, actions: Action[]): void {
        // An update that arrived after a newer one.
        if (version < this.version) {
            return;
        }

        if (version > this.version) {
            this.refused = [];
            this.history.push(...actions);
            if (actions.some((action) => isMoveBy(action, view.player.name))) {
                this.answered(false);
            }
        }

        this.view = view;
        this.version = version;
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

    /** The game finished. Its version counts on into the next game, so it stays. */
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
