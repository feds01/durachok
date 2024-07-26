import InvalidHistoryState from "./errors/InvalidHistoryState";
import { GameState } from "./state";

export type PlayerAction =
    | {
          type: "place";
          card: string;
          player: string;
      }
    | {
          type: "cover";
          card: string;
          player: string;
          on: number;
      }
    | {
          type: "forfeit";
          player: string;
      }
    | {
          type: "pickup";
          cards: string[];
          player: string;
      };

export type AutonomousAction =
    | {
          type: "exit";
          player: string;
          at: number;
      }
    | {
          type: "victory";
          at: number;
      }
    | {
          type: "new_round";
          actors: {
              defender: string;
              attacker: string;
          };
      }
    | {
          type: "start";
          actors: {
              defender: string;
              attacker: string;
          };
      };

export type Action = PlayerAction | AutonomousAction;

/**
 * History class for a game. This class is used to record actions and player
 * interactions within a game so it can later be recalled or re-created.
 * */
export class HistoryNode {
    /**
     * Array of actions that are stored in the current HistoryNode
     * */
    private _actions: Action[];

    /**
     * This is used as a flag for external callers to determine whether or not the
     * node has no more new events to come in.
     * */
    private _finalised: boolean;

    /**
     * HistoryNode constructor
     * */
    constructor(actions: Action[] | null, finalised: boolean = false) {
        this._actions = Array.isArray(actions) ? actions : [];
        this._finalised = finalised;
    }

    /**
     * Setter method for the node's actions parameter.
     * */
    set actions(value: Action[]) {
        this._actions = value;
    }

    /**
     * Getter method for the node's actions parameter.
     * */
    get actions(): Action[] {
        return this._actions;
    }

    /**
     * Setter method for the node's finalised parameter.
     *
     * @param {boolean} value - Set the finalised value for the HistoryNode.
     * */
    set finalised(value: boolean) {
        this._finalised = value;
    }

    /**
     * Getter method for the node's finalised parameter.
     *
     * @return {boolean} Whether or not the HistoryNode has been finalised.
     * */
    get finalised(): boolean {
        return this._finalised;
    }

    /**
     * Method to add an action to the current node.
     *
     * @param {Action} action - The action to be added to the HistoryNode.
     * */
    addAction(action: Action) {
        if (this.finalised)
            throw new InvalidHistoryState(
                "Can't add Action to HistoryNode that's been finalised.",
            );

        this._actions.push(action);
    }

    /**
     * Setter method for the node's actions parameter.
     * */
    findAction<T extends Action["type"]>(type: T): (Action & { type: T })[] {
        return this._actions.filter(
            (action) => action.type === type,
        ) as (Action & { type: T })[];
    }

    /**
     * Method to return the length of the current node. This might be used to summarise
     * multiple recorded actions into a single batch or a 'transient event'
     *
     * @return {number} Returns the total length of all of the actions in this history node
     * */
    getSize(): number {
        return this._actions.length;
    }

    /**
     * Method to remove the last action of the current node.
     * */
    removeLast() {
        if (this._actions.length === 0) return;

        this._actions.pop();
    }

    /**
     * This method is used to serialize the object. This will essentially convert
     * the HistoryNode object into JSON.
     *
     * @return {Action[]} the serialized version of the history.
     * */
    serialize(): { actions: Action[]; finalised: boolean } {
        return {
            actions: this._actions,
            finalised: this.finalised,
        };
    }
}

export type HistoryState = {
    initialState: GameState | null;
    nodes: { actions: Action[]; finalised: boolean }[];
};

/**
 * @version 1.0.0
 * History class for a game. This class is used to record actions and player
 * interactions within a game so it can later be recalled or re-created.
 *
 * @author Alexander. E. Fedotov
 * */
export class History {
    private readonly initialState: GameState;
    private readonly nodes: HistoryNode[];

    /**
     * History class constructor
     *
     * @param {GameState} initialState - The initial state of the game so that
     *                    the game can be re-created from the initial state.
     * @param {?HistoryNode[]} nodes - The history nodes of the previous history
     * */
    constructor(
        initialState: GameState,
        nodes: { actions: Action[]; finalised: boolean }[] | null,
    ) {
        this.initialState = initialState;
        this.nodes = Array.isArray(nodes)
            ? nodes.map((node) => new HistoryNode(node.actions, node.finalised))
            : [];
    }

    /**
     * Method to add a history node to the history.
     *
     * @param {Action | null} begin - Optional initial history entry for the current to start
     * the node off. This parameter is optional and does not need to be utilised.
     *
     * */
    createNode(begin: Action | null) {
        const nodes = [];

        // We might have to declare the previous node as finalised
        const prevNode = this.getLastNode();
        if (prevNode !== null) prevNode.finalised = true;

        // Add the initial node to the HistoryNode (if provided)
        if (begin !== null) nodes.push(begin);

        this.nodes.push(new HistoryNode(nodes));
    }

    /**
     * Method to an entry to the most recent history node. If no node currently
     * exists in the history object, the method will throw an exception as it expects
     * that at least one {@see HistoryNode} exists.
     *
     * @param {Action} action - The action that is to be added.
     * @throws {InvalidHistoryState} If no HistoryNode exists in the current object
     * */
    addEntry(action: Action) {
        if (this.nodes.length === 0) {
            throw new InvalidHistoryState(
                "Cannot add entry when no nodes exist.",
            );
        }

        const node = this.getLastNode()!;
        node.addAction(action);
    }

    /**
     * Method to remove the last added node to the history. If no nodes are currently within
     * the history, no action is performed.
     * */
    removeLastNode() {
        if (this.nodes.length === 0) return;

        this.nodes.pop();
    }

    /**
     * Method to get the last {@see HistoryNode} of the History object.
     * */
    getLastNode(): HistoryNode | null {
        if (this.nodes.length === 0) return null;

        return this.nodes[this.nodes.length - 1];
    }

    /**
     * This method is used to serialize the object. This will essentially convert
     * the history object into JSON.
     *
     * @return {HistoryState} the serialized version of the history.
     * */
    serialize(): HistoryState {
        return {
            initialState: this.initialState,
            nodes: this.nodes.map((node) => node.serialize()),
        };
    }
}
