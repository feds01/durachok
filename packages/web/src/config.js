let api_uri, socket_uri;

if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
    // api_uri = window.location.protocol + "//" + window.location.hostname + ":5000/api";
    api_uri = "/api";

    socket_uri = window.location.protocol + "//" + window.location.hostname + `:5000`;
} else {
    api_uri = "https://durachok-api.herokuapp.com/api";
    socket_uri = 'https://durachok-api.herokuapp.com';
}

export const API_ENDPOINT = api_uri;
export const SOCKET_ENDPOINT = socket_uri;
