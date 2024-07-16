import {Player} from "./player";
import {TableSize} from "./consts";
import {History, HistoryState} from "./history";
import {GameState, PlayerGameState} from "./state";
import {getRandomKey, shuffleArray} from "../utils";
import GameInitError from "./errors/GameInitError";
import InvalidGameState from "./errors/InvalidGameState";
import {CardType, generateCardDeck, parseCard} from "./card";

export type GameSettings = {
    randomisePlayerOrder: boolean;
    shortGameDeck: boolean;
    freeForAll: boolean,
}

export const defaultSettings: GameSettings = {
    randomisePlayerOrder: true,
    shortGameDeck: false,
    freeForAll: true,
}

/**
 * @version 1.0.0
 * Class holds all game logic and all game state access methods.
 *
 * @author Alexander. E. Fedotov
 * */
export class Game {
    public deck: string[];
    public trumpCard: CardType;
    public tableTop: Map<string, string | null>;
    public readonly history: History;
    public players: Map<string, Player>;
    public victory: boolean = false;

    /**
     * @version 1.0.0
     * Game constructor initialises the game deck, players and the
     * history object.
     *
     * @constructor
     * @param {Array<string>} players An array of player names that are within the game.
     * @param {HistoryState} history - An array of history nodes for the game to rebuild the previous
     * @param {GameSettings} settings - Any settings that should be used for the game.
     * state from.
     * */
    constructor(players: string[], history: HistoryState | null, settings: GameSettings = defaultSettings) {
        this.players = new Map();

        /**
         * This is the deck that's currently placed on the table. It's easier to work
         * with a Key-Value structure. The keys signify cards that are opposing the
         * defending player, and the values are the cards that the defending player
         * sets to defend against the card. */
        this.tableTop = new Map();

        // Check if the players argument follows the specified constraints.
        if (!Number.isInteger(players.length) && players.length < 1) {
            throw new GameInitError("Number of players must be a positive integer.");
        } else if (players.length > 8 || (settings.shortGameDeck && players.length > 6)) {
            throw new GameInitError(`Number of players cannot be greater than ${settings.shortGameDeck ? "six (short deck)" : "eight"}.`);
        }

        // check that all of the player names are unique
        if ((new Set(players)).size !== players.length) {
            throw new GameInitError("Player names must be unique.")
        }

        this.deck = generateCardDeck(settings.shortGameDeck);

        // generate card deck and shuffle it for the game
        shuffleArray(this.deck);

        // apply a shuffle to player array if the caller specified to begin
        // the game with random player order
        if (settings.randomisePlayerOrder) shuffleArray(players);

        // set the game up for the 'players' number.
        for (let index = 0; index < players.length; index++) {
            this.players.set(players[index], new Player());
        }

        // distribute the cards between the players as if in a physical way
        for (let index = 0; index < TableSize; index++) {
            this.players.forEach((player) => {
                player.addCard(this.deck.shift()!);
            });
        }

        // select the attacking player randomly, the SDK can provide a method
        // for overriding the starting attacking player later on...
        const chosenDefendingPlayer: string = getRandomKey(this.players);
        this.setDefendingPlayer(chosenDefendingPlayer);

        // Select the first remaining card and set the 'suit' of the game and then
        // shift the first element to the end of the stack.
        const topCard: CardType = parseCard(this.deck[0]);

        this.trumpCard = {
            value: topCard.value,
            suit: topCard.suit,
            card: this.deck[0],
        }

        // put top card to the bottom of the deck as is in the real game
        this.deck.push(this.deck.shift()!);

        // initialise the history object if this game hasn't initialised a history
        // object yet, otherwise re-use the provided history object
        if (history === null || history.initialState === null) {
            this.history = new History(this.serialize().state, []);

            // since it's a new round, we need to create a new node.
            this.history.createNode({
                type: "start", actors: {
                    defender: this.getDefendingPlayerName(),
                    attacker: this.getAttackingPlayerName(),
                }
            });
        } else {
            this.history = new History(history.initialState, history.nodes);
        }
    }


    /**
     * @version 1.0.0
     * Create a game object from a previous game state.
     *
     * @param {GameState} state - The game state including players, history, tableTop, deck and trump card.
     * @param {HistoryState} history - The previous game history (if any).
     * @param {GameSettings} settings - The game settings
     * @return {Game} A game object from the game state.
     * */
    static fromState(state: GameState, history: HistoryState, settings: GameSettings = defaultSettings): Game {
        const game = new Game(Object.keys(state.players), history, settings);

        game.trumpCard = state.trumpCard;
        game.tableTop = new Map(Object.entries(state.tableTop));
        game.players = new Map(Object.entries(state.players));
        game.deck = state.deck;
        game.victory = state.victory;

        return game;
    }

    static performSanityCheck(game: Game): boolean {
        const defender = game.getPlayer(game.getDefendingPlayerName());

        // check that the number of uncovered cards on the table-top is not larger
        // than the number of cards...
        if (game.tableTop.size - game.getCoveredCount() > defender.deck.length) {
            return false;
        }

        return true;
    }


    /**
     * @version 1.0.0
     * This function will setup the next round of the game. The method performs
     * several check and operations in order to prepare for the next round. Firstly,
     * we should determine who the the next defending player should be. This depends
     * on the fact if the current defending player managed to successfully defend
     * themselves or has decided to pickup the cards. Additionally, the method should
     * iterate over all the players to replenish the player card decks.
     *
     * @param {boolean} resignPlayer - This is a boolean flag to represent if a player has resigned (who
     * is a defender for the current round). In that situation, we must treat the end of the round as if
     * the defender 'exited' the game, but the defenders cards are now re-inserted into the table
     * deck.
     *
     * */
    finaliseRound(resignPlayer: boolean = false): void {
        if (this.victory) {
            throw new InvalidGameState("Can't mutate game state after victory.");
        }

        // the round cannot be finalised if no cards were ever put down on to the table
        if (!resignPlayer && this.tableTop.size === 0) {
            throw new InvalidGameState("Cannot finalise round before any cards have been played.");
        }

        // get the round starter before it is overwritten by the 'defense' transfer
        const roundStarter = this.getRoundStarter();

        // Check that all of the cards have been covered by the defending player...
        let forfeitRound = Array.from(this.tableTop.values()).some((card) => {
            return card === null;
        });

        if (!resignPlayer && forfeitRound) {
            // Take the cards from the table top and move them into the players
            // personal deck
            this.transferTableTop(this.getDefendingPlayerName());
            this.setDefendingPlayer(this.getPlayerNameByOffset(this.getDefendingPlayerName(), 2));
        } else {
            const defender = this.getDefendingPlayerName();

            // Use getPlayerOrderFrom here to avoid issue with when the defender gets out of the game
            // and is no longer part of the rounds.
            const playerOrder = this.getPlayerOrderFrom(defender).filter((p) => !this.getPlayer(p).out);

            // check that all players have declared that they finished the round.
            this.setDefendingPlayer(playerOrder[0]);
            this.voidTableTop();
        }

        // Check if the 'spare' deck size is greater than zero and therefore we can
        // replenish the players' card decks.
        if (this.deck.length > 0) {
            // we need to transpose the player list to begin with the player
            // who began the round and the rest following in a clockwise manner.
            for (let offset = 0; offset < this.getActivePlayers().length; offset++) {
                const playerName = this.getPlayerNameByOffset(roundStarter, offset);
                const playerByOffset = this.getPlayer(playerName);

                if (playerByOffset.deck.length < 6) {
                    playerByOffset.deck = [...playerByOffset.deck, ...this.deck.splice(0, 6 - playerByOffset.deck.length)];
                }

                // no point of distributing the cards if there are no cards left.
                if (this.deck.length === 0) break;
            }
        }

        let hasVictory = true;

        // victory condition: check if the defender is the only player who isn't out.
        this.getActivePlayers().forEach(([name, player]) => {

            // check if we need to declare someone as 'out' of the game.
            if (player.deck.length === 0) {
                player.out = Date.now();
            }

            if (name !== this.getDefendingPlayerName() && player.out === null) {
                hasVictory = false;
            }
        });

        if (hasVictory) {
            // Add history entry for the victory
            this.history.addEntry({type: "victory", at: Date.now()});
        } else {
            // since it's a new round, we need to create a new node.
            this.history.createNode({
                type: "new_round", actors: {
                    defender: this.getDefendingPlayerName(),
                    attacker: this.getAttackingPlayerName(),
                }
            });
        }

        this.victory = hasVictory;
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
     * @param {String} name - The id of the player that's taking the card.
     * @param {String} card - The card that's being added to the table top.
     * */
    addCardToTableTop(name: string, card: string): void {
        if (this.victory) throw new InvalidGameState("Can't mutate game state after victory.");

        // check if the deck is already filled up.
        if (this.tableTop.size === 6) throw new Error("Player deck already full.");

        // Check that the player exists
        const player = this.getPlayer(name);

        // Now check the presence of the given card, in the players deck.
        if (!player.deck.includes(card)) throw new InvalidGameState("Player doesn't hold current card");

        // Also check that the current card is allowed to be added to the deck. To determine this,
        // the cardLabel of the card to be added must be present on the tableTop.
        const coveringCard: CardType = parseCard(card);
        const tableTopCards = this.getTableTopDeck();

        if (tableTopCards.length > 0 && !tableTopCards.map(item => parseCard(item).value).includes(coveringCard.value)) {
            throw new InvalidGameState("Card numerical value isn't present on the table top.");
        }

        // Now let's determine if the player is trying to transfer the defensive position
        // to the left hand side player. This can be checked by the fact if the 'card' they
        // are trying to cover is equal to null.
        if (player.isDefending) {
            // the player can't transfer defense if any of the cards are covered...
            if (this.getCoveredCount() !== 0) {
                throw new InvalidGameState("Player can't transfer defense since they have covered a card.")
            }

            const nextPlayer = this.getPlayer(this.getPlayerNameByOffset(name, 1));

            if ((this.tableTop.size - this.getCoveredCount()) + 1 > nextPlayer.deck.length) {
                throw new InvalidGameState("Player doesn't have enough cards to cover attack.");
            }

            // we need to check if the player can transfer the defensive role to the next player. For this to be true,
            // all of the cards in the deck must have the same card label, and, no card must be covered on the deck.
            // Additionally, the role can't be passed if the player to the left has less cards than the length of the deck + 1.
            if (Array.from(this.tableTop.keys()).some((tableCard) => parseCard(tableCard).value !== coveringCard.value)) {
                throw new InvalidGameState("Improper card for the transfer of defense state to next player.");
            }

            // edge case here: if the defender puts the last card down and they don't have anymore
            // cards to pickup, they should be flagged as out of the game, and the defense should
            // be transferred to the next player, but the attack should be the previous player.
            if (player.deck.length === 1 && this.deck.length === 0) {
                player.out = Date.now();

                // Add history entry for the player exit
                this.history.addEntry({type: "exit", player: name, at: player.out});
            }

            const playerOrder = this.getPlayerOrderFrom(name).filter((p) => !this.getPlayer(p).out);
            this.setDefendingPlayer(playerOrder[0]);
        } else {
            const defender = this.getPlayer(this.getDefendingPlayerName());

            // check here that adding another card is still cover-able by the defender.
            if ((this.tableTop.size - this.getCoveredCount()) + 1 > defender.deck.length) {
                throw new InvalidGameState("Player doesn't have enough cards to cover attack.");
            }
        }

        // add the card to the table top from the player's deck.
        this.transferCardOntoTable(name, card);

        // check if the player has no cards in the deck and there no cards in the game deck, then the
        // current player has 'won' the game and apply a timestamp to when they exited the round.
        if (player.deck.length === 0 && this.deck.length === 0) {
            // call finaliseTurn since they might be the attacker at the start of the round, by doing
            // this, all other players can now place cards on the table top.
            this.finalisePlayerTurn(name);

            // Declare after turn finalisation since they might be the attacking player and we need
            // to preserve the order for every other player to receive the ability to attack the
            // defender.
            if (!player.out) {
                player.out = Date.now();

                // Add history entry for the player exit
                this.history.addEntry({type: "exit", player: name, at: player.out});
            } // The player may already be out due to the code above

            // now check here if there is only one player remaining in the game.
            if (this.getActivePlayers().length === 1) {
                this.victory = true;

                // Add history entry for the victory
                this.history.addEntry({type: "victory", at: Date.now()});
            }
        }

        if (this.shouldAutoSkipWhenDefenderForfeits()) this.finaliseRound();
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
     *    and the same suit and or be a card in the trumping suit. If it does not,
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
     * @param {string} card - The card that's going to be used to cover the table top card.
     * @param {number} pos - The position of the card that's going to be covered.
     * */
    coverCardOnTableTop(card: string, pos: number): void {
        const defendingPlayer = this.getPlayer(this.getDefendingPlayerName());

        if (this.victory) {
            throw new InvalidGameState("Can't mutate game state after victory.");
        }

        // check that the 'card' is present on the table top...
        if (!defendingPlayer.deck.includes(card)) {
            throw new InvalidGameState("Defending card is not present in the defending players deck.");
        }


        // check that the 'coveringCard' is present in the defending players deck.
        if (!this.getCardOnTableTopAt(pos)) {
            throw new InvalidGameState("Defending card is not present in the defending players deck.");
        }


        const placedCard: CardType = parseCard(this.getCardOnTableTopAt(pos)!);
        const coveringCard: CardType = parseCard(card);

        /*
         * check whether we are dealing with the same suit of card, or if the defending
         * player is attempting to use the trumping suit. In general, there are three
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
        if (coveringCard.suit === placedCard.suit) {
            // The trumping suit doesn't matter here since they are the same
            if (placedCard.value > coveringCard.value) {
                throw new InvalidGameState("Covering card must have a higher value.");
            }
        } else if (coveringCard.suit !== this.trumpCard.suit) {
            throw new InvalidGameState(`Covering card suit must be the same suit as the table card and have a higher numerical value.`);
        }

        // make a copy of the tableTop for comparison for later comparing
        const oldTableNumerics = this.getTableTopNumerics();

        // Transfer the player card from their deck to the the table top.
        this.tableTop.set(this.getCardOnTableTopAt(pos)!, card);
        defendingPlayer.deck = defendingPlayer.deck.filter((playerCard) => playerCard !== card);

        const newTableNumerics = this.getTableTopNumerics();

        // Add history entry for the pickup
        this.history.addEntry({
            type: "cover", data: [card],
            player: this.getDefendingPlayerName(), on: pos
        });

        // check if the whole table has been covered, then invoke finaliseRound()
        if (this.getCoveredCount() === TableSize || defendingPlayer.deck.length === 0 ||
            (this.tableTop.size === this.getCoveredCount() &&
                this.getAttackingPlayers().every(([n, player]) => player.turned) &&
                oldTableNumerics.size === newTableNumerics.size) ||
            (this.tableTop.size === 4 && this.getCoveredCount() === 4 && newTableNumerics.size === 2)
        ) {
            // declare that the defending player is out
            if (this.deck.length === 0 && defendingPlayer.deck.length === 0) {
                defendingPlayer.out = Date.now();
                this.history.addEntry({type: "exit", player: this.getDefendingPlayerName(), at: defendingPlayer.out});
            }

            this.finaliseRound();
        } else {
            // reset (only if the card numerics changed) everybody's (except defender) 'turned' value since
            // the tableTop state changed.
            if (oldTableNumerics.size !== newTableNumerics.size && this.tableTop.size < 6) {
                this.getActivePlayers().forEach(([name, player]) => {
                    player.turned = false;
                });
            }
        }
    }

    /**
     * @version 1.0.0
     * This method will transfer the status of defending player to the
     * specified player id.
     *
     * @param {String} name - The name of the player that the defending status
     *        is being transferred to.
     * */
    private setDefendingPlayer(name: string): void {
        if (this.victory) {
            throw new InvalidGameState("Can't mutate game state after victory.");
        }

        const defendingPlayer = this.getPlayer(name);

        // reset everyone's privileges for attacking/defending...
        this.players.forEach((player) => {
            player.canAttack = false;
            player.beganRound = false;
            player.isDefending = false;
            player.turned = false;
        });

        // Update the parameters for the attacking and defending player...
        let attackingPlayer = this.getPlayer(this.getPlayerNameByOffset(name, -1));

        attackingPlayer.canAttack = true;
        attackingPlayer.beganRound = true;

        defendingPlayer.isDefending = true;
    }

    /**
     * @version 1.0.0
     * This method will transfer the status of defending player to the
     * specified player id.
     *
     * @param {String} name - The name of the player that the defending status
     *        is being transferred to.
     *
     * */
    public finalisePlayerTurn(name: string): void {
        if (this.victory) {
            throw new InvalidGameState("Can't mutate game state after victory.");
        }

        if (this.tableTop.size === 0) {
            throw new InvalidGameState("Cannot finalise turn when no cards have been placed.");
        }

        const player = this.getPlayer(name);
        player.turned = true;

        // since these players are of significant importance to the round, add a
        // history entry for the forfeit's, (that's if they haven't already declared that
        // they have forfeited.
        const forfeitDeclarations = this.history.getLastNode()!.findAction("forfeit");

        if (forfeitDeclarations.find((action) => action.player === name)) {
            this.history.addEntry({type: "forfeit", player: name});
        }

        // If this is the attacking player, set everyone's 'canAttack' (except defending)
        // player as true since the move has been made..
        const defendingPlayerName = this.getDefendingPlayerName();
        const attackingPlayer = this.getPlayerNameByOffset(defendingPlayerName, -1);

        // If the defender forfeits, everybody can now attack
        if (attackingPlayer === name || defendingPlayerName === name) {
            this.getActivePlayers().forEach(([name, player]) => {
                if (name !== defendingPlayerName) {
                    player.canAttack = true;
                }
            });
        }

        if (this.getActivePlayers().every(([name, player]) => player.turned)) {
            return this.finaliseRound();
        }


        // The case where if everyone but the defending player declares that they have
        // finished the round, and all cards are covered by the defender, we invoke
        // finaliseRound since nobody can perform any additional action on the tabletop.
        let canFinalise = true;

        this.getActivePlayers().forEach(([name, player]) => {
            if (!player.turned && name !== defendingPlayerName) {
                canFinalise = false;
            }
        });

        // https://github.com/feds01/durak-cards#26 - The round should be finalised if attackers
        // can't put down anymore cards.
        // If the defender has declared that they have forfeited, then check if we should
        // auto skip...
        if (this.shouldAutoSkipWhenDefenderForfeits() || canFinalise && this.getCoveredCount() === this.tableTop.size) {
            this.finaliseRound();
        }
    }


    /**
     * Method to check whether the round should be skipped if the defender has declared that they
     * are forfeiting the round. The purpose of this method is to check for obvious cases where
     * the game should prompt the next round. There are other cases where the game could also
     * auto skip, however other cases require checking player deck's and this might give away
     * to some players what other players are holding. Therefore, this method only checks for
     * primitive auto skipping cases.
     *
     * @return {boolean} If the round should be finalised or not.
     * */
    public shouldAutoSkipWhenDefenderForfeits(): boolean {
        const defender = this.getPlayer(this.getDefendingPlayerName());
        const uncoveredCards = this.tableTop.size - this.getCoveredCount();
        const tableTopNumerics = this.getTableTopNumerics();

        // If the defender has declared that they have forfeited, then check if we should
        // auto skip...
        if (defender.turned) {
            if (
                this.tableTop.size === TableSize ||
                uncoveredCards === defender.deck.length ||

                // Special case where 4 cards of the same numeric have been placed and
                // all of them have not been covered, hence preventing attackers from
                // placing anymore cards. Therefore it is safe to finalise the round.
                (this.tableTop.size === 4 && uncoveredCards === 4 && tableTopNumerics.size === 1)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @version 1.0.0
     * This method will resign a player from the game. The player will be removed
     * from the player list, the player's cards will be moved to the bottom of the
     * stack
     *
     * @param {String} name - The name of the player that the defending status
     *        is being transferred to.
     *
     * */
    public resignPlayer(name: string): void {
        const player = this.getPlayer(name);

        // don't do anything if the player is already out, since this doesn't change the state of the game
        if (player.out) return;
        player.out = "resigned";

        // push the player's deck and the table top card onto the back of the deck
        this.deck.push(...player.deck);

        if (this.getActivePlayers().length === 1) {
            this.victory = true;
            return;
        }

        if (player.isDefending) {
            this.deck.push(...this.getTableTopDeck());
            this.finaliseRound(true);
        } else if (player.beganRound) {
            // @Hack: just reset everybody's state by setting the same defending player as the
            // the current defending player
            this.setDefendingPlayer(this.getDefendingPlayerName());
        }
    }

    /**
     * @version 1.0.0
     * This function is used to retrieve the current defending player from the
     * player list.
     *
     * @return {String} the name of the defending player.
     * */
    public getDefendingPlayerName(): string {
        const defendingPlayer = Array.from(this.players.keys()).find((name) => this.players.get(name)!.isDefending);

        if (typeof defendingPlayer === "undefined") {
            throw new InvalidGameState("Invalid game state.")
        }

        return defendingPlayer;
    }

    /**
     * @version 1.0.0
     * This function is used to retrieve the current attacking player from the
     * player list.
     *
     * @return {String} the name of the attacking player.
     * */
    public getAttackingPlayerName(): string {
        const attackingPlayer = Array.from(this.players.keys()).find((name) => this.players.get(name)!.beganRound);

        if (typeof attackingPlayer === "undefined") {
            throw new InvalidGameState("Invalid game state.")
        }

        return attackingPlayer;
    }

    /**
     * @version 1.0.0
     * This function is used to retrieve a player based by an index from the
     * current defending player. If the index is negative, it will index it from
     * the left hand side. If it's positive, then it will return the index from
     * the right hand side.
     *
     * @param {string} name - The player to begin the index at..
     * @param {number} offset - The offset from the current defending player.
     *
     * @return {String} the name of player 'offset' positions after the given one.
     * */
    private getPlayerNameByOffset(name: string, offset: number): string {
        const playerNames = this.getActivePlayers().map(([name]) => name);
        const playerIndex = playerNames.indexOf(name);

        if (playerIndex < 0) {
            throw new InvalidGameState("Player is out of the game or doesn't exist within the lobby.");
        }

        let index = offset + playerIndex;
        if (index < 0) index += playerNames.length;

        return playerNames[index % playerNames.length];
    }

    /**
     * @version 1.0.0
     * Return the players that are still in the game.
     *
     * @returns {Array<Array<string, object>>} An array of player name with the player's state.
     * */
    private getActivePlayers(): [string, Player][] {
        return Array.from(this.players.entries()).filter(([name, player]) => !player.out);
    }

    private getAttackingPlayers(): [string, Player][] {
        return this.getActivePlayers().filter(([name, player]) => !player.isDefending);
    }

    /**
     * @version 1.0.0
     * Method to retrieve the player who started the current round, this method
     * is used to determine how cards should be handed out(replenished) at the end
     * of a round if any player needs cards to fill their deck.
     *
     * @return {string} the name of the player who initiated the round.
     * */
    public getRoundStarter(): string {
        const roundStarter = Array.from(this.players.keys()).find((name) => this.players.get(name)!.beganRound);

        if (typeof roundStarter === "undefined") {
            throw new InvalidGameState("Invalid game state");
        }

        return roundStarter;
    }

    /**
     * @version 1.0.0
     * This function is used to return the contents of the table top in the form of
     * an array. The function does not return 'empty' slots if there are any present.
     *
     * @return {Array<String>} an array of cards.
     * */
    getTableTopDeck(): string[] {
        const tableCard: (string | null)[] = Array.from(this.tableTop.entries()).flat();

        return tableCard.filter((item): item is string => item !== null);
    }

    getTableTopNumerics(): Set<number> {
        return new Set(this.getTableTopDeck().map((card) => parseCard(card).value));
    }

    /**
     * @version 1.0.0
     * Method to get the number of cards that have been covered on the table top.
     *
     * @return {number} the number of covered cards.
     * */
    public getCoveredCount(): number {
        return Array.from(this.tableTop.values()).filter((item): item is string => item !== null).length;
    }

    /**
     * Method to get a bottom card of the table top by a position on the table.
     *
     * @param {number} pos - The position of the card to get from the table top,
     *
     * @return {?String} The card on the table top at the given position, if nothing
     * is at the given position the method will return 'undefined'.
     * */
    public getCardOnTableTopAt(pos: number): string | null {
        if (pos < 0 || pos > 5) {
            throw new InvalidGameState(`Can't get table top card at position '${pos}'`);
        }

        return Array.from(this.tableTop.keys())[pos];
    }

    /**
     * @version 1.0.0
     * This method is used to move a card from a players deck onto the table top. If
     * the tableTop deck is already the size of six or if the card isn't present in
     * the players deck, the method will throw the error.
     *
     * @param {string} name - The name of the player that the card will be transferred to.
     * @param {String} card - The card that's being transferred from the players deck
     *        to the tableTop deck.
     *
     * */
    private transferCardOntoTable(name: string, card: string) {
        if (this.victory) {
            throw new InvalidGameState("Can't mutate game state after victory.");
        }

        const defender = this.getPlayer(this.getDefendingPlayerName());

        if (this.tableTop.size === 6 || (this.tableTop.size - this.getCoveredCount()) + 1 > defender.deck.length) {
            throw new InvalidGameState("Player doesn't have enough cards to cover attack.");
        }

        const player = this.getPlayer(name);

        if (!player.deck.includes(card)) {
            throw new InvalidGameState("Defending card is not present in the defending players deck.");
        }

        this.tableTop.set(card, null);
        player.deck.splice(player.deck.indexOf(card), 1);

        // Add history entry for the place
        this.history.addEntry({type: "place", data: [card], player: name});
    }

    /**
     * @version 1.0.0
     * This function is used to move the contents of the table top to a players
     * deck. An error is thrown if the player that's passed to the function doesn't
     * exist. This transaction is recorded into the history object. If the player does
     * exist, the contents are transferred to the players deck, the table top is cleared.
     *
     * @param {String} to - the 'id' of the player that the table top is being transferred to.
     *
     * */
    private transferTableTop(to: string) {
        if (this.victory) {
            throw new InvalidGameState("Can't mutate game state after victory.");
        }

        const player = this.getPlayer(to);

        player.deck.push(...this.getTableTopDeck());

        // Add history entry for the pickup
        this.history.addEntry({
            type: "pickup",
            data: this.getTableTopDeck(),
            player: to,
        });

        this.voidTableTop();
    }

    /**
     * @version 1.0.0
     * This function will void all the cards that are currently on the table top
     * because it is the end of the round, and the defending player successfully
     * defended themselves against the attackers.
     *
     * */
    private voidTableTop(): void {
        this.tableTop.clear();
    }

    private getPlayerOrderFrom(name: string): string[] {
        const players = Array.from(this.players.keys());
        const idx = players.indexOf(name);

        return [...players.slice(idx + 1, players.length), ...players.slice(0, idx)];
    }

    /**
     * Method used to generate a game state from the perspective of a player. Using the player
     * name, a game state is constructed; notifying the given player with how many cards are in the
     * deck, how many other cards players hold, who has turned, etc.
     *
     * It's important that the information that this method generates for a player does not
     * give any more information than it should. Otherwise the game might not be considered to
     * be fair.
     *
     * @param {String} playerName - The name of the player to generate state for
     * */
    public getStateForPlayer(playerName: string): PlayerGameState {
        const player = this.getPlayer(playerName);

        // transpose the array to match the position of the player on the table
        const playerOrder = this.getPlayerOrderFrom(playerName);

        return {
            ...player,
            out: player.out !== null,

            // general info about the game state
            trumpCard: this.trumpCard,
            deckSize: this.deck.length,

            // @ts-ignore
            tableTop: Object.fromEntries(this.tableTop),

            // information about other players, including how many cards they
            // are holding, if they have turned, and if they are defending...
            players: playerOrder.map(name => {
                const other = this.players.get(name)!;

                return {
                    name,
                    ...other,
                    out: other.out !== null,
                    // allow players who are out of the game to view player decks
                    deck: player.out ? other.deck : other.deck.length,
                }
            }),
        }
    }


    /**
     * Method used to generate a game state from the perspective of a spectator. Spectators do not need all the
     * information on particular player, they only need information on the tableTop, deckSize, and generic information
     * about players in the game.
     *
     * @returns {Partial<PlayerGameState>} A game state from the spectators viewpoint which redacts player
     * state and information on player decks.
     * */
    public getStateForSpectator(): Partial<PlayerGameState> {
        // transpose the array to match the position of the player on the table
        const playerOrder = [this.getDefendingPlayerName(), ...this.getPlayerOrderFrom(this.getDefendingPlayerName())];

        return {
            // general info about the game state
            trumpCard: this.trumpCard,
            deckSize: this.deck.length,

            // @ts-ignore
            tableTop: Object.fromEntries(this.tableTop),
            // information about other players, including how many cards they
            // are holding, if they have turned, and if they are defending...
            players: playerOrder.map(name => {
                const other = this.players.get(name)!;

                return {
                    name,
                    ...other,
                    out: other.out !== null,
                    deck: other.deck.length,
                }
            }),

        }
    }

    public getPlayer(name: string): Player {

        const player = this.players.get(name);

        if (typeof player === 'undefined') {
            throw new InvalidGameState("Invalid game state.")
        }

        return player;
    }

    public getGameState(): GameState {
        return new GameState(
            this.players,
            this.tableTop,
            this.deck,
            this.trumpCard,
            this.victory,
        );
    }

    /**
     * This method is used to serialize the object so it can be written to the database
     * or send over a http transmission.
     *
     * @return {{history: HistoryState, state: GameState}} the serialized version of the game, which is ready to be saved.
     * */
    public serialize(): { history: HistoryState, state: GameState } {
        return {
            history: this.history?.serialize(),
            state: this.getGameState(),
        }
    }
}
