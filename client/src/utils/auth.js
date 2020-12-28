/**
 * Function to get the token and refresh token from the localstorage.
 *
 *  * @return {{"token": ?String, "refreshToken": ?String}} the tokens.
 * */
export function getAuthTokens() {
    const token = sessionStorage.getItem("token");
    const refreshToken = sessionStorage.getItem("refreshToken");

    return {token, refreshToken};
}

/**
 * Function to update the localstorage with a new token and refresh
 * token.
 *
 * @parma {String} token - The new token to be added to the localstorage.
 * @param {String} refreshToken - The new refresh token to be added to the localstorage.
 * */
export const updateTokens = (token, refreshToken) => {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("refreshToken", refreshToken);
}

/**
 * Function to create headers for an authenticated request using the localstorage with a new token
 * and refresh token.
 *
 * @return {{"x-token": ?String, "x-refresh-token": ?String}} the constructed headers.
 * */
export function getAuthHeader() {
    return {
        "x-token": sessionStorage.getItem("token"),
        "x-refresh-token": sessionStorage.getItem("refreshToken")
    }
}
