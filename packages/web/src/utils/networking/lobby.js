import {API_ENDPOINT} from "../../config";
import {getAuthHeader} from "../auth";

export async function joinLobby(pin, credentials) {
    const payload = JSON.stringify(credentials);

    return await fetch(API_ENDPOINT + `/lobby/${pin}/join`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: payload
    }).then((res) => res.json());
}

export async function getLobby(pin) {
    return await fetch(API_ENDPOINT + `/lobby/${pin}`).then((res) => res.json());
}

export async function deleteGame(pin) {
    return await fetch(API_ENDPOINT + `/lobby/${pin}`, {
        method: "DELETE",
        headers: {...getAuthHeader()},
    }).then(res => res.json());
}

export async function createGame(settings) {
    const payload = JSON.stringify(settings);

    return await fetch(API_ENDPOINT + `/lobby`, {
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

    return await fetch(API_ENDPOINT + `/lobby/${lobby}/name`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: payload
    }).then(res => res.json());
}
