import { z } from "zod";
import { ActionsFactory, ClientContext, EmissionMap } from "zod-sockets";

import { ensurePayloadIsTokens } from "../../../lib/authentication";
import { UserTokensResponse } from "../../../schemas/auth";
import { ApiError } from "../../../utils/error";
import { config } from "../config";

export const factory = new ActionsFactory(config);

export type Client = ClientContext<EmissionMap, z.AnyZodObject>["client"];

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

    return auth;
}
