/** A user's access token and the refresh token that renews it. */
export type AuthTokens = {
    token: string;
    refreshToken: string;
};

/** The event that announces tokens the server refreshed, @see saveRefreshedTokens. */
const REFRESHED_TOKENS_EVENT = "durachok:refreshed-tokens";

/**
 * Function to get the token and refresh token from the localStorage.
 * */
export function getAuthTokens() {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");

    return {
        ...(token !== null && { token }),
        ...(refreshToken !== null && { refreshToken }),
    };
}

/**
 * Function to create headers for an authenticated request using the localStorage with a new token
 * and refresh token.
 * */
export function getAuthHeader() {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");

    return {
        ...(token !== null && { "x-token": token }),
        ...(refreshToken !== null && { "x-refresh-token": refreshToken }),
    };
}

/**
 * Save the tokens that the server refreshed, whether a tRPC response or the socket
 * carried them, and announce them so that the auth state picks them up.
 */
export function saveRefreshedTokens(tokens: AuthTokens) {
    localStorage.setItem("token", tokens.token);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    window.dispatchEvent(new CustomEvent<AuthTokens>(REFRESHED_TOKENS_EVENT, { detail: tokens }));
}

/**
 * Listen for tokens that the server refreshed.
 *
 * @returns A function that stops listening.
 */
export function onRefreshedTokens(listener: (tokens: AuthTokens) => void): () => void {
    const handler = (event: Event) => listener((event as CustomEvent<AuthTokens>).detail);
    window.addEventListener(REFRESHED_TOKENS_EVENT, handler);

    return () => window.removeEventListener(REFRESHED_TOKENS_EVENT, handler);
}
