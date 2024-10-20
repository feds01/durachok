import { AuthState } from "../contexts/auth/reducer";
import "../index.css";

import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

/** Router context, available on all routes. */
interface RouterContext {
    /** The current authentication state. */
    auth: AuthState;

    /**
     * Function to invoke logic to remove the authentication session
     * from the current state.
     */
    logout: () => void;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: () => (
        <>
            <Outlet />
            <TanStackRouterDevtools />
        </>
    ),
});
