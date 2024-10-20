import { isDef } from "../../utils";
import { AuthAction, AuthState } from "./reducer";
import React, { createContext } from "react";

type AuthStateContextType = {
    state: AuthState;
    update: (action: AuthAction) => void;
    isRegistered: (state: AuthState) => boolean;
};

export const AuthStateContext = createContext<AuthStateContextType>({
    state: { kind: "logged-out" },
    update: () => {},
    isRegistered: (state) => {
        return state.kind === "logged-in" && state.user.kind === "registered";
    },
});

export function useAuthState() {
    const context = React.useContext(AuthStateContext);

    if (!isDef(context)) {
        throw new Error("useAuthState must be used within a Context");
    }

    return {
        state: context.state,
        isRegistered: () => context.isRegistered(context.state),
    };
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
