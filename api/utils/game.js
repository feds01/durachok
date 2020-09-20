import {nanoid} from "nanoid";

export const CardLabels = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"];
export const CardSuits = ['♡', '♢', '♣', '♤'];

/**
 * Generates a whole card deck for use in the format of a list. Each
 * element follows the format of '<label> of <suit>'.
 * */
export function generateCardDeck() {
    return CardLabels.map((label) => {
        return CardSuits.map((suit) => {
            return `${label} of ${suit}`;
        })
    }).flat();
}


/**
 * Simple function to split the card string into it's 'numerical'
 * value and it's 'suite' value.
 *
 * @param {String} card String representing card which is to be parsed.
 * @return {Array<String>} The numerical and suite component of the card.
 * */
export function parseCard(card) {
    return card.split(" of ")
}

/**
 * Shuffle the deck using
 * */
export function shuffleDeck(deck) {
    let currentIndex = deck.length, temp, randomIndex;

    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temp = deck[currentIndex];
        deck[currentIndex] = deck[randomIndex];
        deck[randomIndex] = temp;
    }

    return deck;
}

export class Game {
    static DECK_SIZE = 6;

    constructor(id, players, history) {
        this.history = {};
        this.players = new Map();

        /**
         * This is the deck that's currently placed on the table. It's easier to work
         * with a Key-Value structure. The keys signify cards that are opposing the
         * defending player, and the values are the cards that the defending player
         * sets to defend against the card. */
        this.tableTop = new Map();

        // generate card deck and shuffle it for the game
        this.deck = generateCardDeck();
        shuffleDeck(this.deck);

        // perform an 'id' check to see if there is a entry within MongoDB

        // Check if the players argument follows the specified constraints.
        if (!Number.isInteger(players) && players < 1) {
            throw new Error("Number of players must be a positive integer.");
        } else if (players > 8) {
            throw new Error("Number of players cannot be greater than eight.");
        } else {
            // set the game up for the 'players' number.
            for (let index = 0; index < players; index++) {
                const id = nanoid();

                this.players.set(id, {
                    deck: [],
                    startsFirst: false,
                    defending: false,
                    failedToDefend: false,
                });
            }
        }

        // distribute the cards between the players as if in a physical way
        for (let index = 0; index < Game.DECK_SIZE; index++) {
            this.players.forEach((value, key, map) => {
                this.players.get(key).deck.push(this.deck.shift());
            });
        }

        // Select the first remaining card and set the 'suite' of the game and then
        // shift the first element to the end of the stack.
        this.trumpSuit = parseCard(this.deck[0])[1];
        this.deck.push(this.deck.shift());

        // Setup the initial state of the game if it hasn't been created yet.
    }

    /**
     * @version 1.0.0
     * This function is used to add a card from the attacking player, or any
     * attacking player. The function will do some basic logic checking on the
     * conditions that should be passed for the card to be added. There are three
     * basic requirements for the card to be added:
     *
     * 1. The defending player must have the the same or greater number of cards
     *    than the cards that aren't covered in the tableTop.
     *
     * 2. There can only be a maximum of 6 cards in a table top
     *
     * 3. The card to be added into the pile must have the same numerical value
     *    as some card on the table top.
     *
     * If these conditions pass, the card is added onto the table top and a history
     * node is added to the game history. The card is also taken from the player
     * that adds the card.
     *
     * @param {String} from - The id of the player that's taking the card.
     * @param {String} card - The card that's being added to the table top.
     * */
    addCardToTableTop(from, card) {
        // check if the deck is already filled up.
        if (!(this.tableTop.size < 6)) {
            throw new Error("Player deck already full.");
        }

        const player = this.players.get(from);

        // check if the id is valid
        if (typeof player === 'undefined') {
            throw new Error("Player doesn't exist.");
        }

        // check that the defending play is able to cover the table top cards.
        const coveredCards = this.tableTop.values().filter((item) => item !== null);

        if (this.tableTop.size - coveredCards.length + 1 > player.deck.length) {
            throw new Error("Player doesn't have enough cards to cover attack.");
        }

        const [cardLabel, cardSuite] = parseCard(card);

        // check if the card is valid
        if (!CardLabels.includes(cardLabel) || !CardSuits.includes(cardSuite)) {
            throw new Error("Invalid card");
        }

        // Now check the presence of the given card, in the players deck.
        if (!player.deck.includes(card)) {
            throw new Error("Player doesn't hold current card");
        }

        // Also check that the current card is allowed to be added to the deck. To determine this,
        // the cardLabel of the card to be added must be present on the tableTop.
        if (!this.getTableTopDeck().map(item => parseCard(item)[0]).includes(cardLabel)) {
            throw new Error("Card numerical value isn't present on the table top.");
        }

        // TODO: add this transaction as a history node.
        // finally, if everything passes then add the card to the table top from the players
        // deck.
        this.tableTop.set(card, null);
        player.deck = player.deck.filter((item) => item !== card);
    }

    /**
     * @version 1.0.0
     * This function is responsible for the logic that dictates what should happen
     * when the defending player attempts to cover a card which is present on the
     * tableTop. There are several checks that must be carried out before the card
     * is placed or covers another card. These checks are:
     *
     * 1. Is the card present in the defending players deck.
     *
     * 2. Is the card they are trying to cover hierarchically higher than the cards
     *    that's on the table. This means that it must have a higher numerical value
     *    and the same suite and or be a card in the trumping suite. If it does not,
     *    the player cannot use it to cover the card.
     *
     * 3. Is the player trying to transfer the defensive role to the next player
     *    by placing the same numeric card as the cards that are present on the
     *    table. For example, if there are two sevens on the table and the player
     *    puts down another seven on the table onto a new spot on the tableTop, this
     *    means that the player on the left hand side becomes the defending player.
     *    The defending player can only do this if they haven't covered any other
     *    cards.
     *
     * @param {String} card - The card that's going to be covered on the table.
     * @param {String} coveringCard - The card that's going to be used to cover the
     *        card on the table.
     * */
    coverCardOnTableTop(card, coveringCard) {
        // check that the 'card' is present on the table top...
        if (!Object.keys(this.tableTop).includes(card)) {
            throw new Error("Card is not present on the table top.");
        }

        const defendingPlayer = this.players.get(this.getDefendingPlayerId());

        // check that the 'coveringCard' is present in the defending players deck.
        if (!defendingPlayer.deck.includes(coveringCard)) {
            throw new Error("Defending card is not present in the defending players deck.");
        }

        // Now let's determine if the player is trying to transfer the defensive position
        // to the left hand side player. This can be checked by the fact if the 'card' they
        // are trying to cover is equal to null.
        if (card === null) {
            const [cardLabel, cardSuit] = parseCard(coveringCard);

            // we need to check if the player can transfer the defensive role to
            // the next player. For this to be true, all of the cards in the deck
            // must have the same card label, and, no card must be covered on the
            // deck. Additionally, the role can't be passed if the player to the
            // left has less cards than the length of the deck + 1.
            if (this.tableTop.keys().some((tableCard) => parseCard(tableCard)[0] !== cardLabel)) {
                throw new Error("Improper card for the transfer of defense state to next player.");
            }

            // check that the next player can handle the defense round...
            let nextPlayer = this.players.get(this.getNextPlayerId());

            if (nextPlayer.deck.length < this.tableTop.size + 1) {
                throw new Error("Cannot transfer defense state to next player since they don't have enough cards.");
            }

            // otherwise we now add the card to the table top and set the next player as the defending player.
            // TODO: add this transaction as a history node.
            this.transferCardOntoTable(defendingPlayer, coveringCard);
        } else {
            const [cardLabel, cardSuit] = parseCard(card);
            const [coveringCardLabel, coveringCardSuit] = parseCard(coveringCard);

            /* check whether we are dealing with the same suite of card, or if the defending
             * player is attempting to use the trumping suite. In general, there are three
             * possible states the game can end up in. These are:
             *
             * 1. If the defending player is using the same suits to cover the table top card
             *
             * 2. If the player is using a trumping suit card to cover another card, unless if
             *    the table card is also a trumping suit. If this is the case, then the defending
             *    player must use a higher numerical value.
             *
             * 3. The defending player attempts to use a different, non-trumping suit card to
             *    cover the card which is an illegal state.
             */

            if (cardSuit === coveringCardSuit) {
                if (cardSuit === this.trumpSuit) {
                    if (coveringCardSuit !== this.trumpSuit) {
                        throw new Error("Covering card suit must be a higher value trumping card.");
                    }

                    if (CardSuits.indexOf(cardLabel) > CardSuits.indexOf(coveringCardLabel)) {
                        throw new Error("Covering card must have a higher value.");
                    }
                } else {
                    if (CardSuits.indexOf(cardLabel) > CardSuits.indexOf(coveringCardLabel)) {
                        throw new Error("Covering card must have a higher value.");
                    }
                }
            } else {
                if (coveringCardSuit !== this.trumpSuit) {
                    throw new Error(`
                        Covering card suit must be the same suit as the 
                        table card and have a higher numerical value.
                    `);
                }
            }

            // Transfer the player card from their deck to the the table top.
            this.tableTop.set(card, coveringCard);
            defendingPlayer.deck = defendingPlayer.deck.filter((playerCard) => playerCard !== coveringCardSuit);

        }
    }

    /**
     * @version 1.0.0
     * This function is used to retrieve the current defending player from the
     * player list.
     *
     * @return {String} the 'id' of the defending player.
     * */
    getDefendingPlayerId() {
        const generator = this.players.keys();
        let nextItem = generator.next();

        while (!(nextItem.done || this.players.get(nextItem.value).defending)) {
            nextItem = generator.next();
        }

        return nextItem.value;
    }

    getAttackingPlayerId() {
        const playerIds = Array.from(this.players.keys());
        const defendingPlayerIdx = playerIds.indexOf(this.getDefendingPlayerId());

        if (defendingPlayerIdx === 0) {
            return playerIds.pop();
        }

        return playerIds[(defendingPlayerIdx - 1) % this.players.size];
    }

    getNextPlayerId() {
        const playerIds = Array.from(this.players.keys());
        const defendingPlayerIdx = playerIds.indexOf(this.getDefendingPlayerId());

        if (defendingPlayerIdx === this.players.size - 1) {
            return playerIds[0];
        }

        return playerIds[(defendingPlayerIdx + 1) % this.players.size];
    }


    /**
     * @version 1.0.0
     * This function is used to return the contents of the table top in the form of
     * an array. The function does not return 'empty' slots if there are any present.
     *
     * @return {Array<String>} an array of cards.
     * */
    getTableTopDeck() {
        return this.tableTop.entries().flat().filter(item => item !== null);
    }

    /**
     * @version 1.0.0
     * This method is used to move a card from a players deck onto the table top. If
     * the tableTop deck is already the size of six or if the card isn't present in
     * the players deck, the method will throw the error.
     *
     * @param {Object} player - The player object that holds player state.
     * @param {String} card - The card that's being transferred from the players deck
     *        to the tableTop deck.
     * */
    transferCardOntoTable(player, card) {
        if (!(this.tableTop.size < 6)) {
            throw new Error("Player deck already full.");
        }

        if (!player.deck.includes(card)) {
            throw new Error("Defending card is not present in the defending players deck.");
        }

        this.tableTop.set(card, null);
        player.deck = player.deck.filter((tableCard) => tableCard !== card);
    }

    /**
     * @version 1.0.0
     * */
    addHistoryNode() {
    }

    /**
     * @version 1.0.0
     * This function is used to move the contents of the table top to a players
     * deck. An error is thrown if the player that's passed to the function doesn't
     * exist. This transaction is recorded into the history object. If the player does
     * exist, the contents are transferred to the players deck, the table top is cleared.
     *
     * @param {String} to - the 'id' of the player that the table top is being transferred to.
     * */
    transferTableTop(to) {
        if (!this.players.has(to)) {
            throw new Error("Player doesn't exist.");
        }

        // TODO: add this transaction as a history node.
        this.players.get(to).deck.push(...this.getTableTopDeck());
        this.voidTableTop();
    }


    /**
     * @version 1.0.0
     * This function will void all the cards that are currently on the table top
     * because it is the end of the round, and the defending player successfully
     * defended themselves against the attackers.
     * */
    voidTableTop() {
        // TODO: add this transaction as a history node.
        this.tableTop.clear();
    }

    serialize() {
    }
}
