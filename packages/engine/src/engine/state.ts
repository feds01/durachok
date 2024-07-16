import {History} from "./history";
import {Player} from "./player";
import {CardType} from "./card";

export class GameState {
    readonly players: {[key: string]: Player};
    readonly tableTop: {[key: string]: string | null};

    constructor(
        players: Map<string, Player>,
        tableTop: Map<string, string | null>,
        public deck: string[],
        public trumpCard: CardType,
        public victory: boolean
    ) {
        this.players = Object.fromEntries(players.entries());
        this.tableTop = Object.fromEntries(tableTop.entries());
    }
}

export type PlayerState = {
    name: string,
    deck: string[] | number,
    out: boolean,
    turned: boolean,
    beganRound: boolean,
    isDefending: boolean,
    canAttack: boolean,
}

export class PlayerGameState {
    constructor(
        public players: PlayerState[],
        public history: History | null,
        public tableTop: {[key: string]: string},
        public deckSize: number,
        public trumpCard: CardType,
    ) {
    }
}
