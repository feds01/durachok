import { API_ENDPOINT } from "../../config";
import { UserRegistrationRequest } from "../../types/user";
import { expr } from "../../utils";
import { AuthAction } from "./reducer";

async function login(name: string, password: string) {
    const payload = JSON.stringify({ name, password });

    return await fetch(API_ENDPOINT + `/user/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: payload,
    }).then((res) => res.json());
}

export async function register(
    email: string,
    name: string,
    password: string,
    token: string,
) {
    const payload = JSON.stringify({ email, name, password, token });

    return await fetch(API_ENDPOINT + `/user/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: payload,
    }).then((res) => res.json());
}

export async function registerUser(
    dispatch: (action: AuthAction) => void,
    { email, name, password, token }: UserRegistrationRequest,
) {
    try {
        dispatch({ type: "REQUEST_REGISTER" });

        const res = await register(email, name, password, token);

        if (res.status && res.name) {
            dispatch({ type: "REGISTER_SUCCESS", payload: res });

            // update local storage values
            localStorage.setItem("name", res.name);
            localStorage.setItem("email", res.email);
            localStorage.setItem("token", res.token);
            localStorage.setItem("refreshToken", res.refreshToken);
        }

        dispatch({ type: "LOGIN_ERROR", error: res.message });
        return res;
    } catch (error: unknown) {
        const message = expr(() => {
            if (error instanceof Error) {
                return error.message;
            }
            return "Unknown error occurred";
        });

        dispatch({ type: "LOGIN_ERROR", error: message });
    }
}

export async function loginUser(
    dispatch: (action: AuthAction) => void,
    name: string,
    password: string,
) {
    try {
        dispatch({ type: "REQUEST_LOGIN" });

        const res = await login(name, password);

        if (res.status && res.name) {
            dispatch({ type: "LOGIN_SUCCESS", payload: res });

            // update local storage values
            localStorage.setItem("name", res.name);
            localStorage.setItem("email", res.email);
            localStorage.setItem("token", res.token);
            localStorage.setItem("refreshToken", res.refreshToken);
        }
        dispatch({ type: "LOGIN_ERROR", error: res.message });
        return res;
    } catch (error: unknown) {
        dispatch({ type: "LOGIN_ERROR", error: "unknown error occurred" });
    }
}

export async function logout(dispatch: (action: AuthAction) => void) {
    dispatch({ type: "LOGOUT" });

    // clear local storage
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
}
