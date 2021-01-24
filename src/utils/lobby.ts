import {customAlphabet} from "nanoid";
import {shuffleArray, CardSuits} from "shared";
import {IGame, Player} from "../models/game";


/**
 * Method to check if a name is free within a lobby. This also includes 'registered' players
 * as they take priority over anonymous players.
 *
 * @param {Object} lobby - The lobby object.
 * @param {string} name - The player name.
 *
 * @return {boolean} If the player name can be used or not.
 * */
export async function checkIfNameFree(lobby: IGame, name: string) {
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
export function buildPlayerList(lobby: IGame, ignoreUnconfirmed: boolean = true): Player[] {
    return lobby.players.filter(player => {
       return ignoreUnconfirmed ? player.confirmed : true;
    });
}


/**
 * Method to generate a game pin
 * */
export function createGamePin(): string {
    const generator = customAlphabet("1234567890", 6);

    return generator();
}

/**
 * Method to generate a security phrase for a lobby using the card suit
 * characters.
 *
 * @returns {string} the generated phrase.
 * */
export function createGamePassphrase(): string {
    const cardSuites = Object.values(CardSuits);
    shuffleArray(cardSuites);

    return cardSuites.join("");
}
