import { GameSettings } from "../request/game";
import { PlayerMove } from "../schemas/game";
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

/**
 * A client of one lobby, over a socket. It joins the lobby whenever the socket connects,
 * sends the lobby what the player asks for, and hands on what the server sends. Make it
 * before the socket connects, so that it joins on the first connection too.
 */
export class LobbyClient {
    public constructor(
        private readonly socket: ClientSocket,
        /** The pin of the lobby. */
        public readonly pin: string,
    ) {
        // The server sends a player's updates to the connection that they joined from, so a
        // new connection, e.g. after the last one dropped, joins again.
        socket.on("connect", () => this.send("join"));
    }

    /**
     * Listen for an event from the server.
     *
     * @returns A function that stops listening.
     */
    public on<E extends ServerEvent>(event: E, listener: (...args: ServerEventArgs<E>) => void): () => void {
        const handler = (...args: unknown[]) => listener(...(args as ServerEventArgs<E>));
        this.socket.on(event, handler);
        return () => this.socket.off(event, handler);
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

    private send<E extends ClientEvent>(event: E, ...args: ClientEventArgs<E>): void {
        this.socket.emit(event, this.pin, ...args);
    }
}
