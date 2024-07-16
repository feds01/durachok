import {API_ENDPOINT} from "../../config";

async function login(name, password) {
    const payload = JSON.stringify({name, password});

    return await fetch(API_ENDPOINT + `/user/login`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: payload
    }).then(res => res.json());
}

export async function register(email, name, password, token) {
    const payload = JSON.stringify({email, name, password, token});

    return await fetch(API_ENDPOINT + `/user/register`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: payload
    }).then(res => res.json());
}

export async function registerUser(dispatch, {email, name, password, token}) {
    try {
        dispatch({ type: 'REQUEST_REGISTER' });

        const res = await register(email, name, password, token);

        if (res.status && res.name) {
            dispatch({ type: 'REGISTER_SUCCESS', payload: res });

            // update local storage values
            localStorage.setItem('name', res.name);
            localStorage.setItem('email', res.email);
            localStorage.setItem("token", res.token);
            localStorage.setItem("refreshToken", res.refreshToken);
        }

        dispatch({ type: 'LOGIN_ERROR', error: res.message });
        return res;
    } catch (error) {
        dispatch({ type: 'LOGIN_ERROR', error });
    }

}

export async function loginUser(dispatch, name, password) {
    try {
        dispatch({ type: 'REQUEST_LOGIN' });

        const res = await login(name, password);

        if (res.status && res.name) {
            dispatch({ type: 'LOGIN_SUCCESS', payload: res });

            // update local storage values
            localStorage.setItem('name', res.name);
            localStorage.setItem('email', res.email);
            localStorage.setItem("token", res.token);
            localStorage.setItem("refreshToken", res.refreshToken);
        }
        dispatch({ type: 'LOGIN_ERROR', error: res.message });
        return res;
    } catch (error) {
        dispatch({ type: 'LOGIN_ERROR', error: error });
    }
}

export async function logout(dispatch) {
    dispatch({ type: 'LOGOUT' });

    // clear local storage
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
}
