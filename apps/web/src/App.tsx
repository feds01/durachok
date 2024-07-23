import { ThemeProvider } from "@emotion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, RouterProvider, createRouter } from "@tanstack/react-router";
import { httpBatchLink } from "@trpc/react-query";
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
