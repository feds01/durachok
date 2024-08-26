import * as native from "@trpc/client";
import * as rq from "@trpc/react-query";
import { Buffer } from "buffer";
import superjson from "superjson";

import type { AppRouter } from "../../../server/src/interface/routes";
import { API_URL } from "../config";
import { getAuthHeader } from "./auth";

/** Define our tRPC instance from the server definition. */
const trpc = rq.createTRPCReact<AppRouter>();

/**
 * Register a hook to convert `Buffer`s to base64
 *
 * @@Todo: maybe move this to `packages/transport`?
 */
superjson.registerCustom<Buffer, string>(
    {
        isApplicable: (value): value is Buffer => Buffer.isBuffer(value),
        serialize: (value) => value.toString("base64"),
        deserialize: (value) => Buffer.from(value, "base64"),
    },
    "buffer",
);

/** Define the non-query router kind. */
export const trpcNativeClient = native.createTRPCClient<AppRouter>({
    links: [
        native.httpBatchLink({
            url: API_URL,
            headers() {
                return getAuthHeader();
            },
            transformer: superjson,
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
                transformer: superjson,
            }),
        ],
    });
};

export default trpc;
