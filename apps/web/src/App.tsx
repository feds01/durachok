import { ThemeProvider } from "@emotion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, RouterProvider, createRouter } from "@tanstack/react-router";
import { httpBatchLink } from "@trpc/react-query";
import { Buffer } from "buffer";
import { useState } from "react";
import superjson from "superjson";

import { useAuthState } from "./contexts/auth";
import { routeTree } from "./routeTree.gen";
import theme from "./theme";
import { getAuthHeader } from "./utils/auth";
import { trpc } from "./utils/trpc";

// Create a new router instance
const router = createRouter({
    routeTree,
    defaultNotFoundComponent: () => {
        return <Navigate to="/" />;
    },
    context: null!,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

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

const App = () => {
    const auth = useAuthState();
    const [queryClient] = useState(() => new QueryClient());
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: "http://localhost:5000/api/trpc",
                    headers() {
                        return getAuthHeader();
                    },
                    transformer: superjson,
                }),
            ],
        }),
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme()}>
                    <RouterProvider router={router} context={{ auth }} />
                </ThemeProvider>
            </QueryClientProvider>
        </trpc.Provider>
    );
};

export default App;
