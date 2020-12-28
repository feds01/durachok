import {getAuthHeader} from "./auth";

export async function joinLobby(pin, credentials) {
    const payload = JSON.stringify(credentials);

    return await fetch(`/api/lobby/${pin}/join`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: payload
    }).then((res) => res.json());
}


export async function login(name, password) {
    const payload = JSON.stringify({name, password});

    return await fetch(`/api/user/login`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: payload
    }).then(res => res.json());
}


export async function deleteGame(pin) {
    return await fetch(`/api/lobby/${pin}`, {
        method: "DELETE",
        headers: getAuthHeader(),
    }).then(res => res.json());
}

export async function createGame(settings) {
    const payload = JSON.stringify(settings);

    return await fetch(`/api/lobby`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: payload,
    }).then(res => res.json());
}



export async function checkName(lobby, name) {
    const payload = JSON.stringify({name});

    return await fetch(`/api/lobby/${lobby}/name`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: payload
    }).then(res => res.json());
}
