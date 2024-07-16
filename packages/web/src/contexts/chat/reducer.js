export const initialState = {
    messages: [],
    opened: false,
    disabled: false,
    unreadCount: 0,
};

export function init({disabled, messages}) {
    return {...initialState, messages, disabled};
}

export const reducer = (initialState, action) => {
    switch (action.type) {
        case "PUT_MESSAGE": {
            return {
                ...initialState,
                messages: [...initialState.messages, action.message],
                unreadCount: initialState.opened ? initialState.unreadCount : initialState.unreadCount + 1,
            };
        }
        case "TOGGLE_CHAT": {
            return {
                ...initialState,
                unreadCount: !initialState.opened ? 0 : initialState.unreadCount,
                opened: !initialState.opened,
            }
        }
        default: {
            throw new Error(`Unhandled action type: ${action.type}`);
        }
    }
};
