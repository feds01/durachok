import {customAlphabet} from "nanoid";
import Players from "../models/user";


/**
 * Method to check if a name is free within a lobby. This also includes 'registered' players
 * as they take priority over anonymous players.
 *
 * @param {Object} lobby - The lobby object.
 * @param {string} name - The player name.
 *
 * @return {boolean} If the player name can be used or not.
 * */
export async function checkIfNameFree(lobby, name) {
    const playerList = buildPlayerList(lobby);

    return !playerList.map(p => p.name).includes(name);
}

/**
 * Utility method to build a player list with some parameters for a given lobby.
 *
 * @param {Object} lobby - The lobby object
 * @param {boolean} ignoreUnconfirmed - Whether or not to skip players that have not
 *                 made a connection to the socket server.
 *
 * @returns {Array<{name: string, id: string, registered: boolean}>} The player list
* */
export function buildPlayerList(lobby, ignoreUnconfirmed = true) {
    const playerList = []

    for (const player of lobby.players) {
        if (!ignoreUnconfirmed && !player.confirmed) {
            continue;
        }

        playerList.push({id: player._id, name: player.name, registered: player.registered});
    }

    return playerList;
}


/**
 *
 *
 * */
export function createGamePin() {
    const generator = customAlphabet("1234567890", 6);

    return generator();
}
