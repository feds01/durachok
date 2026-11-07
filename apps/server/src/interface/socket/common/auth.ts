import { Context } from "../../../lib/context";
import { UserTokensResponse } from "../../../schemas/auth";
import { ApiError } from "../../../utils/error";
import { Client } from "../actions/ctx";

/**
 * Get the tokens that the connection middleware verified for a client.
 *
 * @param client - The client that sent the message.
 *
 * @returns The client's tokens and their payload.
 */
export function ensureAuth(client: Client): UserTokensResponse {
    const { auth } = client.getData();
    if (!auth) {
        throw ApiError.http(401, "Invalid token");
    }

    return auth;
}

/**
 * Utility function to ensure that a given socket connection request is authenticated.
 *
 * @param context - The context of the current server execution.
 * @param client - The client that sent the message.
 * @param pin - The pin of the lobby.
 *
 * @returns Whether the client is within the lobby.
 */
export async function ensureLobbyAccess(
    ctx: Context,
    client: Client,
    pin: string,
): Promise<{ name: string; isRegistered: boolean }> {
    const auth = ensureAuth(client);

    // Ensure that the current client has access to the lobby.
    ctx.logger.info({ id: client.id, pin }, "checking client has access to lobby");

    if (!(await ctx.lobbyService.hasAccess(auth.payload, pin))) {
        throw ApiError.http(401, "Invalid token");
    }

    // @@Todo: perhaps we should return the player since the information might be useful?
    if (auth.payload.kind === "anonymous") {
        return { name: auth.payload.name, isRegistered: false };
    }
    return { name: auth.payload.user.name, isRegistered: true };
}

/**
 * Utility function to ensure that a given client is the owner of a lobby, meaning
 * that they can perform actions such as kicking players.
 *
 * @param context - The context of the current server execution
 * @param client - The client that sent the message.
 * @param pin - The pin of the lobby.
 *
 * @returns Whether the client is the owner of the lobby.
 */
export async function ensureOwnerAccess(ctx: Context, client: Client, pin: string): Promise<void> {
    const auth = ensureAuth(client);

    // Ensure that the current client has access to the lobby.
    ctx.logger.info({ id: client.id, pin }, "checking client has owner access to lobby");

    if (!(await ctx.lobbyService.hasOwnerAccess(auth.payload, pin))) {
        throw ApiError.http(401, "Invalid token");
    }

    // @@Todo: perhaps we should return the player since the information might be useful?
    return;
}
