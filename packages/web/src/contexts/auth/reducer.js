const name = localStorage.getItem("name");
const email = localStorage.getItem("email");
const token = localStorage.getItem("token");
const refreshToken = localStorage.getItem("refreshToken")

export const initialState = {
    name: "" || name,
    email: "" || email,
    token: "" || token,
    refreshToken: "" || refreshToken,
    loading: false,
};

export function init() {
    return initialState;
}

export const reducer = (initialState, action) => {
    switch (action.type) {
        case "REQUEST_LOGIN":
        case "REQUEST_REGISTER":
            return {
                ...initialState,
                loading: true
            };
        case "LOGIN_SUCCESS":
        case "REGISTER_SUCCESS":
            return {
                ...initialState,
                ...action.payload,
                loading: false
            };
        case "UPDATE_CREDENTIALS": {
            return {
                ...initialState,
                ...action.payload,
            }
        }
        case "UPDATE_TOKEN": {
            // update the local storage with them...
            localStorage.setItem("token", action.token);
            localStorage.setItem("refreshToken", action.refreshToken);

            return {
                ...initialState,
                token: action.token,
                refreshToken: action.refreshToken
            }
        }
        case "LOGOUT":
            return {
                ...initialState,
                user: "",
                token: "",
                refreshToken: "",
            };

        case "LOGIN_ERROR":
            return {
                ...initialState,
                loading: false,
            };

        default:
            throw new Error(`Unhandled action type: ${action.type}`);
    }
};
