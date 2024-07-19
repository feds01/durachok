import React, { createContext, useReducer } from "react";

import { isDef } from "../../utils";
import { AuthAction, AuthState, init, reducer } from "./reducer";

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

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, update] = useReducer(reducer, init());

    return (
        <AuthStateContext.Provider
            value={{
                state,
                update,
            }}
        >
            {children}
        </AuthStateContext.Provider>
    );
};
