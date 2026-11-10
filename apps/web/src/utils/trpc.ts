import type { AppRouter } from "../../../server/src/interface/routes";

import { API_URL } from "@/config";
import { getAuthHeader, saveRefreshedTokens } from "@/utils/auth";
import { transformer } from "@durachok/transport";
import * as native from "@trpc/client";
import * as rq from "@trpc/react-query";

/** Define our tRPC instance from the server definition. */
const trpc = rq.createTRPCReact<AppRouter>();

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
            transformer,
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
                transformer,
            }),
        ],
    });
};

export default trpc;
