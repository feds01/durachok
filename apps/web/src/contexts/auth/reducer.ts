import {
    Account,
    RefreshedTokens,
    RegisteredUser,
    Seat,
    StoredAuth,
    loadAuth,
    replaceTokens,
    saveAuth,
} from "../../utils/auth";

export type { AnonymousUser, RegisteredUser, Seat, SpectatorUser } from "../../utils/auth";

/** The authentication state: the account that the person logged in to, and their seats in lobbies. */
export type AuthState = StoredAuth;

/** An action that indicates what happened to the auth-state. */
export type AuthAction =
    | {
          /** The person logged in to their account. */
          type: "login";
          payload: Account;
      }
    | {
          /** The person joined a lobby without an account, and got a seat in it. */
          type: "join";
          pin: string;
          payload: Seat;
      }
    | {
          /** The person gave up their seat in a lobby. */
          type: "leave";
          pin: string;
      }
    | {
          type: "update";
          payload: Omit<RegisteredUser, "kind">;
      }
    | {
          /** The server refreshed a session's expired tokens. */
          type: "tokens";
          payload: RefreshedTokens;
      }
    | {
          /** The person logged out of their account. Their seats stay theirs. */
          type: "logout";
      };

/** The auth that the browser kept, which is kept again, as reading it may have pruned it, @see readAuth. */
export function init(): AuthState {
    const auth = loadAuth();
    saveAuth(auth);
    return auth;
}

/** The auth-state after an action. */
export function reduceAuth(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case "login":
            return { ...state, account: action.payload };
        case "join":
            return { ...state, seats: { ...state.seats, [action.pin]: action.payload } };
        case "leave":
            return {
                ...state,
                seats: Object.fromEntries(Object.entries(state.seats).filter(([pin]) => pin !== action.pin)),
            };
        case "update":
            if (!state.account) {
                return state;
            }
            return { ...state, account: { ...state.account, user: { ...action.payload, kind: "registered" } } };
        case "tokens":
            return replaceTokens(state, action.payload);
        case "logout":
            return { ...state, account: null };
    }
}

/**
 * Function to reduce the current state of the auth-context based on the action that was
 * dispatched. The browser keeps the new state straight away, as the requests that follow,
 * such as the next page's, read their tokens from it.
 */
export const reducer = (state: AuthState, action: AuthAction): AuthState => {
    const next = reduceAuth(state, action);
    if (next !== state) {
        saveAuth(next);
    }
    return next;
};
