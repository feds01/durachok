import React, { createContext } from "react";

import { assert, isDef } from "../../utils";
import { AuthAction, AuthState } from "./reducer";

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
        throw new Error("useAuthState must be used within an AuthStateContext");
    }

    return {
        state: context.state,
        isRegistered: () => context.isRegistered(context.state),
    };
}

export function useRegisteredUser() {
    const context = React.useContext(AuthStateContext);

    if (!isDef(context)) {
        throw new Error(
            "useRegisteredUser must be used within an AuthStateContext",
        );
    }

    assert(
        context.state.kind === "logged-in",
        "useRegisteredUser can only be used when the user is logged in",
    );
    assert(
        context.state.user.kind === "registered",
        "useRegisteredUser can only be used with a registered user",
    );

    return context.state.user;
}

export function useAuthDispatch() {
    const context = React.useContext(AuthStateContext);

    if (!isDef(context)) {
        throw new Error(
            "useAuthDispatch must be used within an AuthStateContext",
        );
    }

    return context.update;
}

export function useAuth() {
    const context = React.useContext(AuthStateContext);

    if (!isDef(context)) {
        throw new Error(
            "useAuthDispatch must be used within an AuthStateContext",
        );
    }

    return [context.state, context.update] as const;
}
