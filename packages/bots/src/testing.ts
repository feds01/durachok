import { PlayerGameState, PlayerMove } from "@durachok/transport";

import { Observation } from "./observation";

/** A game that has just begun, as its attacker sees it, for a test that doesn't look at the game itself. */
const VIEW: PlayerGameState = {
    player: { name: "bot", deck: ["6S", "7S"], out: null, turned: false, beganRound: true, action: "attack" },
    players: [
        {
            name: "other",
            deck: { type: "hidden", size: 6 },
            out: null,
            turned: false,
            beganRound: false,
            action: "defend",
        },
    ],
    tableTop: {},
    deckSize: 24,
    discardSize: 0,
    trump: { suit: "H", card: "AH" },
};

/** An observation of a game with the moves given, for a test of a strategy that looks only at its moves. */
export function observationWith(moves: PlayerMove[]): Observation {
    return { view: VIEW, table: [], deck: { size: 24, discarded: 0 }, moves, history: [] };
}
