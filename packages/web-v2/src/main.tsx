import React from "react";
import ReactDOM from "react-dom/client";

import { Navigate, RouterProvider, createRouter } from "@tanstack/react-router";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { ThemeProvider } from "@emotion/react";
import theme from "./theme";

// Create a new router instance
const router = createRouter({
    routeTree,
    defaultNotFoundComponent: () => {
        return <Navigate to="/" />;
    },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme()}>
            <RouterProvider router={router} />
        </ThemeProvider>
    </React.StrictMode>,
);
