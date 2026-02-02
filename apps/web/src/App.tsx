import { Buffer } from "buffer";
import { useEffect, useState } from "react";
import { registerCustom } from "superjson";

import { useAuthDispatch, useAuthState } from "@/contexts/auth";
import { routeTree } from "@/routeTree.gen";
import theme from "@/theme";
import trpc, { createReactQueryTRPClient } from "@/utils/trpc";
import { ThemeProvider } from "@emotion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, RouterProvider, createRouter } from "@tanstack/react-router";

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
registerCustom<Buffer, string>(
    {
        isApplicable: (value): value is Buffer => Buffer.isBuffer(value),
        serialize: (value) => value.toString("base64"),
        deserialize: (value) => Buffer.from(value, "base64"),
    },
    "buffer",
);

const App = () => {
    const { state } = useAuthState();
    const auth = useAuthDispatch();
    const [queryClient] = useState(() => new QueryClient());
    const [trpcClient] = useState(createReactQueryTRPClient);

    useEffect(() => {
        router.invalidate();
    }, [state]);

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme()}>
                    <RouterProvider
                        router={router}
                        context={{
                            auth: state,
                            logout: () => auth({ type: "logout" }),
                        }}
                    />
                </ThemeProvider>
            </QueryClientProvider>
        </trpc.Provider>
    );
};

export default App;
