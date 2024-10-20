import { AuthStateContext } from "./context";
import { AuthState, init, reducer } from "./reducer";
import { useReducer } from "react";

interface AuthProviderProps {
    children: React.ReactNode;
}

function isRegistered(state: AuthState) {
    return state.kind === "logged-in" && state.user.kind === "registered";
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, update] = useReducer(reducer, init());

    return (
        <AuthStateContext.Provider
            value={{
                state,
                update,
                isRegistered,
            }}
        >
            {children}
        </AuthStateContext.Provider>
    );
};
