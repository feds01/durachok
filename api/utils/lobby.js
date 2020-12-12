import {CardSuits} from "../common/game";
import {customAlphabet} from "nanoid";
import Players from "../models/user";


/**
 *
 * */
export async function checkNameFree(lobby, name) {
    const playerList = await buildPlayerList(lobby);

    return !playerList.includes(name);
}

/**
 *
* */
export async function buildPlayerList(lobby) {
    const playerList = []

    for (const player of lobby.players) {
        // If this is an id to a player that is registered within the users
        // cluster, then use their username as a name checker.
        if (typeof player === "string") {
            const playerObject = await Players.findOne({_id: player});

            playerList.push(playerObject.name)
        }

        // If the player is a temporary player and has just been added into the lobby
        if (typeof player === "object") {
            playerList.push(player.name);
        }
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

export function createGamePassphrase() {
    const cardSuites = CardSuits.slice();
    let currentIndex = cardSuites.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = cardSuites[currentIndex];
        cardSuites[currentIndex] = cardSuites[randomIndex];
        cardSuites[randomIndex] = temporaryValue;
    }

    return cardSuites.join("");
}
