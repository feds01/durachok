import { z } from "zod";
import { LobbyClient, TokensMessage } from "@durachok/transport";
import { io } from "socket.io-client";

import { BotPlayer, BotPlayerOptions } from "./player";

/** Where a bot plays: the server, the lobby, and the bot's tokens from the server's registry. */
export interface BotSeat {
    /** The server's address, e.g. `http://localhost:8080`. */
    url: string;
    /** The pin of the lobby. */
    pin: string;
    /** The bot's tokens, from `just bots`. */
    tokens: TokensMessage;
    /** The lobby's passphrase, if it has one. */
    passphrase?: string;
}

/** A bot playing in a lobby. */
export interface RunningBot {
    /** The bot's client of the lobby. */
    client: LobbyClient;
    /** Resolves with why the bot left the lobby: e.g. it was kicked, the lobby was deleted, or the server refused its tokens. */
    left: Promise<string>;
    /** Stop playing, and close the bot's connection. */
    stop(): void;
}

/**
 * Take a seat in a lobby and play in it, as a person does through the web app, until the bot
 * leaves the lobby, @see joinLobby, @see connectBot.
 */
export async function playInLobby(seat: BotSeat, options: BotPlayerOptions): Promise<RunningBot> {
    const tokens = await joinLobby(seat);
    return connectBot({ ...seat, tokens }, options);
}

/**
 * Take a seat in a lobby as a bot, as a person joins one through the web app: the server
 * checks that the bot is in its registry, and seats it if the lobby has a free place. A bot
 * that already has a seat in the lobby, e.g. because it played there before, keeps it.
 *
 * @returns The bot's tokens, which the server renews when they have expired.
 */
export async function joinLobby({ url, pin, tokens, passphrase }: BotSeat): Promise<TokensMessage> {
    const seated = await call(url, "lobbies.get", { pin }, tokens, "GET");
    if (seated.ok) {
        return seated.tokens;
    }

    const joined = await call(url, "lobbies.join", { pin, ...(passphrase && { passphrase }) }, seated.tokens);
    if (!joined.ok) {
        throw new Error(`Couldn't join lobby ${pin}: ${joined.message}`);
    }
    return joined.tokens;
}

/**
 * Play a seat in a lobby over a socket, through the same client as the web app, until the
 * bot leaves the lobby. The bot needs a seat in it first, @see joinLobby.
 */
export function connectBot({ url, pin, tokens }: BotSeat, options: BotPlayerOptions): RunningBot {
    let current = tokens;
    // A function, so that each reconnection sends the tokens as they are then.
    const socket = io(url, { auth: (cb) => cb(current), transports: ["websocket"] });
    const client = new LobbyClient(socket, pin);
    const player = new BotPlayer(client, options);

    const { promise: left, resolve: leave } = Promise.withResolvers<string>();
    const stop = (reason: string) => {
        player.stop();
        socket.removeAllListeners();
        socket.disconnect();
        leave(reason);
    };

    client.on("tokens", (renewed) => (current = renewed));
    client.on("close", ({ reason }) => stop(reason));
    // The server refused the tokens, e.g. because the bot was removed from the registry, so the socket stops trying.
    socket.on("connect_error", (error) => {
        if (!socket.active) {
            stop(error.message);
        }
    });

    return { client, left, stop: () => stop("stopped") };
}

/** The result of calling the server's API, with the tokens as the server left them. */
type CallResult = { ok: true; tokens: TokensMessage } | { ok: false; message: string; tokens: TokensMessage };

/** What the server answers a failed tRPC request with, of which a bot reads the message. */
const TrpcFailureSchema = z.object({ error: z.object({ json: z.object({ message: z.string() }) }) });

/** Call one of the server's API procedures, as the web app's client does. */
async function call(
    url: string,
    path: string,
    input: unknown,
    tokens: TokensMessage,
    method: "GET" | "POST" = "POST",
): Promise<CallResult> {
    const body = JSON.stringify({ json: input });
    const headers = {
        "content-type": "application/json",
        "x-token": tokens.token,
        "x-refresh-token": tokens.refreshToken,
    };
    // A query sends its input in the URL, and a mutation in the body.
    const response =
        method === "GET"
            ? await fetch(`${url}/api/trpc/${path}?input=${encodeURIComponent(body)}`, { headers })
            : await fetch(`${url}/api/trpc/${path}`, { method: "POST", headers, body });

    // The server renews tokens that have expired, and hands the new ones back.
    const renewed = {
        token: response.headers.get("x-token") || tokens.token,
        refreshToken: response.headers.get("x-refresh-token") || tokens.refreshToken,
    };
    if (response.ok) {
        return { ok: true, tokens: renewed };
    }

    // tRPC says what went wrong in the body, which a proxy's error page, say, doesn't have.
    const failure = TrpcFailureSchema.safeParse(await response.json().catch(() => null));
    if (!failure.success) {
        return { ok: false, message: `HTTP ${response.status}`, tokens: renewed };
    }
    return { ok: false, message: failure.data.error.json.message, tokens: renewed };
}
