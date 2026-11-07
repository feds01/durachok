import type { AppRouter } from "../../../server/src/interface/routes";
import { Buffer } from "buffer";
import { SuperJSON, registerCustom } from "superjson";

import { API_URL } from "@/config";
import { getAuthHeader, saveRefreshedTokens } from "@/utils/auth";
import * as native from "@trpc/client";
import * as rq from "@trpc/react-query";

/** Define our tRPC instance from the server definition. */
const trpc = rq.createTRPCReact<AppRouter>();

/**
 * Register a hook to convert `Buffer`s to base64
 *
 * @@Todo: maybe move this to `packages/transport`?
 */
registerCustom<Buffer, string>(
    {
        isApplicable: (value): value is Buffer => Buffer.isBuffer(value),
        serialize: (value) => value.toString("base64"),
        deserialize: (value) => Buffer.from(value, "base64"),
    },
    "buffer",
);

/**
 * Fetch for the tRPC links, which keeps the tokens that the server sends back in the
 * response headers when it refreshed expired ones.
 */
async function fetchKeepingRefreshedTokens(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, init);
    const token = response.headers.get("x-token");
    const refreshToken = response.headers.get("x-refresh-token");

    if (token && refreshToken) {
        saveRefreshedTokens({ token, refreshToken });
    }

    return response;
}

/** Define the non-query router kind. */
export const trpcNativeClient = native.createTRPCClient<AppRouter>({
    links: [
        native.httpBatchLink({
            url: API_URL,
            headers() {
                return getAuthHeader();
            },
            fetch: fetchKeepingRefreshedTokens,
            transformer: SuperJSON,
        }),
    ],
});

/** Function to create our native react query client. */
export const createReactQueryTRPClient = () => {
    return trpc.createClient({
        links: [
            rq.httpBatchLink({
                url: API_URL,
                headers() {
                    return getAuthHeader();
                },
                fetch: fetchKeepingRefreshedTokens,
                transformer: SuperJSON,
            }),
        ],
    });
};

export default trpc;
