import { useReducer } from "react";

import { AuthStateContext } from "./context";
import { init, reducer } from "./reducer";

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
