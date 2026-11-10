import type { AppRouter } from "../../../server/src/interface/routes";

import { API_URL } from "@/config";
import { isDef } from "@/utils";
import { getAuthHeader, saveRefreshedTokens } from "@/utils/auth";
import { transformer } from "@durachok/transport";
import * as native from "@trpc/client";
import type { Operation } from "@trpc/client";
import * as rq from "@trpc/react-query";

/** Define our tRPC instance from the server definition. */
const trpc = rq.createTRPCReact<AppRouter>();

/**
 * Fetch for the tRPC links, which keeps the tokens that the server sends back in the
 * response headers when it refreshed expired ones, in place of the session that sent them.
 */
async function fetchKeepingRefreshedTokens(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, init);
    const token = response.headers.get("x-token");
    const refreshToken = response.headers.get("x-refresh-token");

    if (token && refreshToken) {
        const sent = new Headers(init?.headers).get("x-refresh-token") ?? undefined;
        saveRefreshedTokens(sent, { token, refreshToken });
    }

    return response;
}

/** The lobby that a call is about, which picks the seat whose tokens it sends, @see getAuthHeader. */
function pinOf(op: Operation): string | undefined {
    const { input } = op;
    if (typeof input === "object" && input !== null && "pin" in input && typeof input.pin === "string") {
        return input.pin;
    }
}

/**
 * The links to the API. A call about a lobby goes on its own, with the tokens of the person's
 * seat in it, if they have one, and the others go together, with the account's.
 */
function links() {
    return [
        native.splitLink<AppRouter>({
            condition: (op) => isDef(pinOf(op)),
            true: native.httpLink({
                url: API_URL,
                headers: ({ op }) => getAuthHeader(pinOf(op)),
                fetch: fetchKeepingRefreshedTokens,
                transformer,
            }),
            false: native.httpBatchLink({
                url: API_URL,
                headers: () => getAuthHeader(),
                fetch: fetchKeepingRefreshedTokens,
                transformer,
            }),
        }),
    ];
}

/** Define the non-query router kind. */
export const trpcNativeClient = native.createTRPCClient<AppRouter>({ links: links() });

/** Function to create our native react query client. */
export const createReactQueryTRPClient = () => trpc.createClient({ links: links() });

export default trpc;
