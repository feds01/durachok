import { Action } from "@durachok/transport/src/schemas/game";

export type HistoryState = {
    nodes: Action[];
};

/**
 * @version 1.0.0
 * History class for a game. This class is used to record actions and player
 * interactions within a game so it can later be recalled or re-created.
 * */
export class History {
    /**
     * History class constructor
     *
     * @param {GameState} state - The initial state of the game so that
     *                    the game can be re-created from the initial state.
     * @param {?Action[]} nodes - The events that make up the history.
     * */
    constructor(private readonly nodes: Action[] = []) {}

    /**
     * Method to an entry to the history. This will add an action to the history.
     *
     * @param {Action} action - The action that is to be added.
     * */
    addEntry(action: Action) {
        this.nodes.push(action);
    }

    /**
     * This method is used to serialize the object. This will essentially convert
     * the history object into JSON.
     *
     * @return {HistoryState} the serialized version of the history.
     * */
    serialize(): HistoryState {
        return {
            nodes: this.nodes,
        };
    }
}
