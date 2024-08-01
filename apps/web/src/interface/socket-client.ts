import type { Socket as SocketBase } from "socket.io-client";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Root {
    /** @desc The actual path of the Root namespace */
    export const path = "/";
    export interface Emission {
        lobbyState: (p1: {
            update:
                | {
                      type: "new_player";
                  }
                | {
                      type: "new_spectator";
                  };
        }) => void;
        countdown: () => void;
        gameStarted: () => void;
        message: (p1: {
            name: string;
            time: number;
            owner?: string | undefined;
            message: string;
        }) => void;
        victory: (p1: {
            players: {
                name: string;
                at: Date;
            }[];
        }) => void;
        close: (p1: { reason: string; extra?: string | undefined }) => void;
        state: (p1: {
            update: {
                trump: {
                    suit: string;
                    card: string;
                    value: number;
                };
                players: Record<
                    string,
                    {
                        name: string;
                        out: number | null;
                        turned: boolean;
                        beganRound: boolean;
                        action: "attack" | "defend" | "none";
                        deck: string[];
                    }
                >;
                tableTop: Record<string, string | null>;
                deck: string[];
                victory: boolean;
            };
        }) => void;
        action: (p1: {
            actions: {
                action:
                    | (
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
                            }
                      )
                    | (
                          | {
                                type: "exit";
                                player: string;
                            }
                          | {
                                type: "victory";
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
                            }
                      );
                occurred_at: Date;
            }[];
            update: {
                trump: {
                    suit: string;
                    card: string;
                    value: number;
                };
                players: Record<
                    string,
                    {
                        name: string;
                        out: number | null;
                        turned: boolean;
                        beganRound: boolean;
                        action: "attack" | "defend" | "none";
                        deck: string[];
                    }
                >;
                tableTop: Record<string, string | null>;
                deck: string[];
                victory: boolean;
            };
        }) => void;
        error: (p1: {
            type:
                | "internal"
                | "bad_request"
                | "unauthorized"
                | "invalid_move"
                | "stale_game";
            message?: string | undefined;
        }) => void;
    }
    export interface Actions {
        join: (p1: string) => void;
        leave: (p1: string) => void;
        kick: (
            p1: string,
            p2: {
                id: string;
            },
        ) => void;
        message: (
            p1: string,
            p2: {
                message: string;
            },
        ) => void;
        move: (
            p1: string,
            p2:
                | {
                      type: "place";
                      card: string;
                  }
                | {
                      type: "cover";
                      position: number;
                      card: string;
                  },
        ) => void;
        resign: (p1: string) => void;
        start: (p1: string) => void;
        passphrase: (p1: string, p2: string) => void;
    }
    /** @example const socket: Root.Socket = io(Root.path) */
    export type Socket = SocketBase<Emission, Actions>;
}
