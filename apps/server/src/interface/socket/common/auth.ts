import { Context } from "../../../lib/context";
import { UserTokensResponse } from "../../../schemas/auth";
import { DBPlayer, isPlayer } from "../../../schemas/lobby";
import { isDef } from "../../../utils";
import { ApiError } from "../../../utils/error";
import { Client, Rooms } from "../actions/ctx";

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
 * Ensure that a client is one of the players of a lobby.
 *
 * @param context - The context of the current server execution.
 * @param client - The client that sent the message.
 * @param pin - The pin of the lobby.
 *
 * @returns The player's name in the lobby, whether they are registered, and whether they own it.
 */
export async function ensureLobbyAccess(
    ctx: Context,
    client: Client,
    pin: string,
): Promise<{ name: string; isRegistered: boolean; isOwner: boolean }> {
    const { payload } = ensureAuth(client);
    ctx.logger.info({ id: client.id, pin }, "checking client has access to lobby");

    const player = await ctx.lobbyService.findPlayer(payload, pin);
    if (!player) {
        throw ApiError.http(401, "Invalid token");
    }

    return {
        name: player.name,
        isRegistered: payload.kind === "registered",
        isOwner: await ctx.lobbyService.hasOwnerAccess(payload, pin),
    };
}

/**
 * The connections in a lobby's room that are a player's, from each of their tabs, e.g. to take
 * them all out of the room once the player leaves it.
 */
export async function clientsOf(withRooms: Rooms, pin: string, player: DBPlayer) {
    const clients = await withRooms(pin).getClients();
    return clients.filter((client) => {
        const { auth } = client.getData();
        return isDef(auth) && isPlayer(auth.payload, player);
    });
}

/**
 * Ensure that a client owns a lobby, so that they can perform actions such as kicking players.
 *
 * @param context - The context of the current server execution
 * @param client - The client that sent the message.
 * @param pin - The pin of the lobby.
 */
export async function ensureOwnerAccess(ctx: Context, client: Client, pin: string): Promise<void> {
    const { payload } = ensureAuth(client);
    ctx.logger.info({ id: client.id, pin }, "checking client has owner access to lobby");

    if (!(await ctx.lobbyService.hasOwnerAccess(payload, pin))) {
        throw ApiError.http(401, "Invalid token");
    }
}
