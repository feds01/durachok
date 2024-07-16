// Context/context.js

import React, {useReducer} from "react";
import {init, reducer} from "./reducer";

export const ChatStateContext = React.createContext(null);
export const ChatDispatchContext = React.createContext(null);


export function useChatState() {
    const context = React.useContext(ChatStateContext);

    if (typeof context === undefined) {
        throw new Error("useAuthState must be used within a Context");
    }

    return context;
}

export function useChatDispatch() {
    const context = React.useContext(ChatDispatchContext);

    if (typeof context === undefined) {
        throw new Error("useAuthDispatch must be used within a Context");
    }

    return context;
}

export const ChatProvider = ({disabled, chat, children }) => {
    const [messages, dispatch] = useReducer(reducer, {disabled, messages: chat}, init);

    return (
        <ChatStateContext.Provider value={messages}>
            <ChatDispatchContext.Provider value={dispatch}>
                {children}
            </ChatDispatchContext.Provider>
        </ChatStateContext.Provider>
    );
}
