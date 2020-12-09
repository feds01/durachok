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
