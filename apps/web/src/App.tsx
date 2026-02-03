import { Buffer } from "buffer";
import { useEffect, useState } from "react";
import { registerCustom } from "superjson";

import { useAuthDispatch, useAuthState } from "@/contexts/auth";
import { routeTree } from "@/routeTree.gen";
import trpc, { createReactQueryTRPClient } from "@/utils/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, RouterProvider, createRouter } from "@tanstack/react-router";

const router = createRouter({
    routeTree,
    defaultNotFoundComponent: () => {
        return <Navigate to="/" />;
    },
    context: null!,
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

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
                <RouterProvider
                    router={router}
                    context={{
                        auth: state,
                        logout: () => auth({ type: "logout" }),
                    }}
                />
            </QueryClientProvider>
        </trpc.Provider>
    );
};

export default App;
