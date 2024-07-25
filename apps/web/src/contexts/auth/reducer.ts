import { assert } from "../../utils";

/** Information that a registered user contextually stores. */
export type RegisteredUser = {
    kind: "registered";
    id: string;
    name: string;
    email: string;
    image?: string;
};

/** Information that a anonymous user contextually stores. */
type AnonymousUser = {
    kind: "anonymous";
    // @@Todo: support anonymous users entering multiple lobbies.
    lobby: string;
};

/** The state when we have a logged in user, whether that is anonymous or not. */
type LoggedInAuthState = {
    kind: "logged-in";
    token: string;
    refreshToken: string;
    user: RegisteredUser | AnonymousUser;
};

/** The state when we are logged out. */
type LoggedOutAuthState = {
    kind: "logged-out";
};

/** The authentication state, either "logged-in" or "logged-out" */
export type AuthState = LoggedInAuthState | LoggedOutAuthState;

/** An action that indicates what happened to the auth-state. */
export type AuthAction =
    | {
          type: "login";
          payload: Omit<LoggedInAuthState, "kind">;
      }
    | {
          type: "update";
          payload: Omit<RegisteredUser, "kind">;
      }
    | {
          type: "logout";
      };

export function init(): AuthState {
    // @@Cleanup: use zod to validate this.
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    const user = localStorage.getItem("user");

    if (!token || !refreshToken || !user) {
        return { kind: "logged-out" };
    }

    return {
        kind: "logged-in",
        token,
        refreshToken,
        user: JSON.parse(user),
    };
}

/**
 * Function to reduce the current state of the auth-context based on the action
 * that was dispatched.
 * */
export const reducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case "login":
            localStorage.setItem("token", action.payload.token);
            localStorage.setItem("refreshToken", action.payload.refreshToken);
            localStorage.setItem("user", JSON.stringify(action.payload.user));
            return { "kind": "logged-in", ...action.payload };
        case "update":
            assert(state.kind === "logged-in");
            localStorage.setItem("user", JSON.stringify(action.payload));
            return {
                ...state,
                user: { ...action.payload, kind: "registered" },
            };
        case "logout":
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            return { kind: "logged-out" };
    }
};
