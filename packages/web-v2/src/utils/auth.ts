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
