import { AuthStateContext } from "./context";
import { AuthState, init, reducer } from "./reducer";
import { useEffect, useMemo, useReducer } from "react";

import { onRefreshedTokens } from "@/utils/auth";

interface AuthProviderProps {
    children: React.ReactNode;
}

function isRegistered(state: AuthState) {
    return state.kind === "logged-in" && state.user.kind === "registered";
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, update] = useReducer(reducer, init());

    // Keep the tokens that the server refreshed, from tRPC responses or the socket.
    useEffect(() => onRefreshedTokens((tokens) => update({ type: "tokens", payload: tokens })), []);

    // A new value only when the state changes, so that the context's readers render only then.
    const value = useMemo(() => ({ state, update, isRegistered }), [state]);

    return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
};
