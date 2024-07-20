type LoggedInAuthState = {
    kind: "logged-in";
    token: string;
    refreshToken: string;
};

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
          type: "logout";
      };

export function init(): AuthState {
    // @@Cleanup: use zod to validate this.
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!token || !refreshToken) {
        return { kind: "logged-out" };
    }

    return {
        token: token ?? "",
        refreshToken: refreshToken ?? "",
        kind: "logged-in",
    };
}

export const reducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case "login":
            console.log("we are in the login case");
            // update the local storage with them...
            localStorage.setItem("token", action.payload.token);
            localStorage.setItem("refreshToken", action.payload.refreshToken);
            return { "kind": "logged-in", ...action.payload };
        case "logout":
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            return { kind: "logged-out" };
    }
};
