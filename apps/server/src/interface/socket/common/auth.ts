import { ensurePayloadIsTokens } from "../../../lib/authentication";
import { UserTokensResponse } from "../../../schemas/auth";
import { ApiError } from "../../../utils/error";
import { Client } from "../actions/ctx";

/**
 * Utility function to ensure that a given socket connection request is authenticated.
 *
 * @param client - The client that sent the message.
 *
 * @returns Extract the authentication tokens from the client's handshake.
 */
export function ensureAuth(client: Client): UserTokensResponse {
    const auth = ensurePayloadIsTokens(client.handshake.auth);
    if (!auth) {
        throw ApiError.http(401, "Invalid token");
    }

    // Ensure that the current client has access to the lobby.

    return auth;
}
