/**
 * Function to get the token and refresh token from the localstorage.
 *
 * @return {{"token": ?String, "refreshToken": ?String}} the tokens.
 * */
export function getAuthTokens() {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");

    return {
        ...(token !== null) && {token},
        ...(refreshToken !== null) && {refreshToken},
    }
}

/**
 * Function to create headers for an authenticated request using the localstorage with a new token
 * and refresh token.
 *
 * @return {{?token, ?refreshToken}} the constructed headers.
 * */
export function getAuthHeader() {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");

    return {
        ...(token !== null) && {'x-token': token},
        ...(refreshToken !== null) && {'x-refresh-token': refreshToken},
    }
}
