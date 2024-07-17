export type AuthState = {
    name: string;
    email: string;
    token: string;
    refreshToken: string;
    loading: boolean;
};

export type AuthAction =
    | {
          type: "REQUEST_LOGIN" | "REQUEST_REGISTER";
      }
    | {
          type: "LOGIN_SUCCESS" | "REGISTER_SUCCESS";
          payload: Omit<AuthState, "loading">;
      }
    | {
          type: "UPDATE_CREDENTIALS";
          payload: Omit<AuthState, "loading">;
      }
    | {
          type: "UPDATE_TOKEN";
          token: string;
          refreshToken: string;
      }
    | {
          type: "LOGOUT";
      }
    | {
          type: "LOGIN_ERROR";
          error: string;
      };

export function init(): AuthState {
    // @@Cleanup: use zod to validate this.
    const name = localStorage.getItem("name");
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");

    return {
        name: name ?? "",
        email: email ?? "",
        token: token ?? "",
        refreshToken: refreshToken ?? "",
        loading: false,
    };
}

export const reducer = (state: AuthState, action: AuthAction) => {
    switch (action.type) {
        case "REQUEST_LOGIN":
        case "REQUEST_REGISTER":
            return {
                ...state,
                loading: true,
            };
        case "LOGIN_SUCCESS":
        case "REGISTER_SUCCESS":
            return {
                ...state,
                ...action.payload,
                loading: false,
            };
        case "UPDATE_CREDENTIALS": {
            return {
                ...state,
                ...action.payload,
                loading: false,
            };
        }
        case "UPDATE_TOKEN": {
            // update the local storage with them...
            localStorage.setItem("token", action.token);
            localStorage.setItem("refreshToken", action.refreshToken);

            return {
                ...state,
                token: action.token,
                refreshToken: action.refreshToken,
            };
        }
        case "LOGOUT":
            return {
                ...state,
                user: "",
                token: "",
                refreshToken: "",
            };

        case "LOGIN_ERROR":
            return {
                ...state,
                loading: false,
            };
    }
};
