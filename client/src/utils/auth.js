/**
 * Function to update the localstorage with a new token and refresh
 * token.
 *
 * @parma {String} token - The new token to be added to the localstorage.
 * @parma {String} refreshToken - The new refresh token to be added to the localstorage.
 * */
export const updateTokens = (token, refreshToken) => {
    localStorage.setItem("token", token);
    localStorage.setItem("refreshToken", refreshToken);
}
