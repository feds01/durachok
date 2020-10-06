import {CardSuits} from "./game";
import {customAlphabet} from "nanoid";


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
