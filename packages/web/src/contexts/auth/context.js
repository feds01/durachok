// Context/context.js

import React, {useReducer} from "react";
import {init, initialState, reducer} from "./reducer";

export const AuthStateContext = React.createContext();
export const AuthDispatchContext = React.createContext();


export function useAuthState() {
    const context = React.useContext(AuthStateContext);

    if (typeof context === undefined) {
        throw new Error("useAuthState must be used within a Context");
    }

    return context;
}

export function useAuthDispatch() {
    const context = React.useContext(AuthDispatchContext);

    if (typeof context === undefined) {
        throw new Error("useAuthDispatch must be used within a Context");
    }

    return context;
}

export const AuthProvider = ({ children }) => {
    const [user, dispatch] = useReducer(reducer, initialState, init);

    return (
        <AuthStateContext.Provider value={user}>
            <AuthDispatchContext.Provider value={dispatch}>
                {children}
            </AuthDispatchContext.Provider>
        </AuthStateContext.Provider>
    );
}
