import { GameSettings } from "../request/game";
import { PlayerMove } from "../schemas/game";
import { isDef } from "../utils";
import { ClientEvent, ClientEventArgs, ServerEvent, ServerEventArgs } from "./protocol";

/**
 * The parts of a socket.io client socket that a lobby client uses, so that any socket will
 * do: one in the browser, in a bot, or a fake one in a test.
 */
export interface ClientSocket {
    on(event: string, listener: (...args: unknown[]) => void): unknown;
    off(event: string, listener: (...args: unknown[]) => void): unknown;
    emit(event: string, ...args: unknown[]): unknown;
}

/** The events that update the game, each with the version of the game that it shows. */
type GameUpdate = "action" | "playerState" | "spectate";

type Listener<E extends ServerEvent> = (...args: ServerEventArgs<E>) => void;

/**
 * A client of one lobby, over a socket. It joins the lobby whenever the socket connects,
 * sends the lobby what the player asks for, and hands on what the server sends. Make it
 * before the socket connects, so that it joins on the first connection too.
 *
 * Updates of the game can arrive out of order, so it hands one on only if it is newer than the
 * last: an action that came after a newer one, or again, is left out.
 */
export class LobbyClient {
    /** The version of the newest game that the client handed on, which counts on from one game to the next. */
    private gameVersion = -1;
    /** Who listens for each update of the game, which the client hands on only once it is known to be new. */
    private readonly updates: { [E in GameUpdate]: Set<Listener<E>> } = {
        action: new Set(),
        playerState: new Set(),
        spectate: new Set(),
    };

    public constructor(
        private readonly socket: ClientSocket,
        /** The pin of the lobby. */
        public readonly pin: string,
    ) {
        // The server sends a player's updates to the connection that they joined from, so a
        // new connection, e.g. after the last one dropped, joins again.
        socket.on("connect", () => this.send("join"));
        // Joining, as a player or a spectator, brings the game as it is now, which no update from before can replace.
        socket.on("join", (...args) => {
            const [{ gameVersion }] = args as ServerEventArgs<"join">;
            if (isDef(gameVersion)) {
                this.gameVersion = gameVersion;
            }
        });
        socket.on("action", (...args) => this.update("action", args as ServerEventArgs<"action">));
        socket.on("playerState", (...args) => this.update("playerState", args as ServerEventArgs<"playerState">));
        socket.on("spectate", (...args) => this.update("spectate", args as ServerEventArgs<"spectate">));
    }

    /**
     * Listen for an event from the server.
     *
     * @returns A function that stops listening.
     */
    public on<E extends ServerEvent>(event: E, listener: Listener<E>): () => void {
        switch (event) {
            case "action":
            case "playerState":
            case "spectate": {
                const listeners = this.updates[event as GameUpdate] as unknown as Set<Listener<E>>;
                listeners.add(listener);
                return () => listeners.delete(listener);
            }
            default: {
                const handler = (...args: unknown[]) => listener(...(args as ServerEventArgs<E>));
                this.socket.on(event, handler);
                return () => this.socket.off(event, handler);
            }
        }
    }

    /** Leave the lobby, which a player can only do before the game starts, and the owner can't. */
    public leave(): void {
        this.send("leave");
    }

    /** Remove a player from the lobby, which only the owner can do. */
    public kick(name: string): void {
        this.send("kick", { name });
    }

    /** Send a message to the lobby's chat. */
    public sendMessage(message: string): void {
        this.send("message", { message });
    }

    /** Make a move in the game. */
    public move(move: PlayerMove): void {
        this.send("move", move);
    }

    /** Start the game, which only the owner can do. */
    public start(): void {
        this.send("start");
    }

    /** Give the lobby a new passphrase, which only the owner can do. */
    public rotatePassphrase(): void {
        this.send("passphrase");
    }

    /** Change the lobby's settings, which only the owner can do, before the game starts. */
    public updateSettings(settings: GameSettings): void {
        this.send("settings", settings);
    }

    /**
     * Hand on an update of the game, if it's newer than the last. Each action is a new version,
     * but the server sends the game again at the same version when it refuses a move.
     */
    private update<E extends GameUpdate>(event: E, args: ServerEventArgs<E>): void {
        const [{ version }] = args;
        const isNew = event === "playerState" ? version >= this.gameVersion : version > this.gameVersion;
        if (!isNew) {
            return;
        }

        this.gameVersion = version;
        for (const listener of this.updates[event]) {
            listener(...args);
        }
    }

    private send<E extends ClientEvent>(event: E, ...args: ClientEventArgs<E>): void {
        this.socket.emit(event, this.pin, ...args);
    }
}
