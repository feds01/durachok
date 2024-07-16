import React from "react";

// Create a Context
const defaultState = {
    deck: [],
    deckSize: 0,
    players: [],
    trumpCard: null,
    tableTop: Array.from(Array(6), () => []),

    out: false,
    turned: false,
    isDefending: false,
    canAttack: false,
}

export const GameContext = React.createContext(defaultState);

export function useGameState() {
    const context = React.useContext(GameContext);

    if (typeof context === 'undefined') {
        throw new Error('useSelectorState must be used within a SelectorProvider');
    }

    return context;
}
