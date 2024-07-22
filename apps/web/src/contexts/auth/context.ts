import React, { createContext } from "react";

import { isDef } from "../../utils";
import { AuthAction, AuthState } from "./reducer";

type AuthStateContextType = {
    state: AuthState;
    update: (action: AuthAction) => void;
};

export const AuthStateContext = createContext<AuthStateContextType>({
    state: { kind: "logged-out" },
    update: () => {},
});

export function useAuthState() {
    const context = React.useContext(AuthStateContext);

    if (!isDef(context)) {
        throw new Error("useAuthState must be used within a Context");
    }

    return context.state;
}

export function useAuthDispatch() {
    const context = React.useContext(AuthStateContext);

    if (!isDef(context)) {
        throw new Error("useAuthDispatch must be used within a Context");
    }

    return context.update;
}

export function useAuth() {
    const context = React.useContext(AuthStateContext);

    if (!isDef(context)) {
        throw new Error("useAuthDispatch must be used within a Context");
    }

    return [context.state, context.update] as const;
}
