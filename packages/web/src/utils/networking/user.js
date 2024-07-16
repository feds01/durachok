import {getAuthHeader} from "../auth";
import {API_ENDPOINT} from "../../config";


export async function getUser(dispatch) {
    // Attempt to refresh the token first
    const tokenRefresh = await fetch(API_ENDPOINT + `/user/token`, {
        method: "POST",
        headers: {...getAuthHeader()},
    })
        .then((res) => res.json())
        .then((res) => {
            if (!res.status) {
                return res;
            }

            dispatch({type: "UPDATE_TOKEN", token: res.token, refreshToken: res.refreshToken});
            return null;
        });

    // Return the token refresh response since it failed and the
    // caller might implement some logic to re-direct the user to
    // a login page.
    if (tokenRefresh !== null) {
        return tokenRefresh;
    }

    // Make a request for user information.
    return await fetch(API_ENDPOINT + `/user`, {
        headers: {...getAuthHeader()},
    }).then((res) => res.json());
}

export async function deleteUser() {
    // Make a request for user information.
    return await fetch(API_ENDPOINT + `/user`, {
        method: "DELETE",
        headers: {...getAuthHeader()},
    }).then((res) => res.json());
}

/**
 *
 * */
export async function updateUserDetails(payload) {
    const body = JSON.stringify(payload);

    return await fetch(API_ENDPOINT + `/user`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body,
    }).then((res) => res.json());
}
