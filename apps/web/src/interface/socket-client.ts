import type { Socket as SocketBase } from "socket.io-client";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Root {
    /** @desc The actual path of the Root namespace */
    export const path = "/";
    export interface Emission {
        join: (p1: {
            lobby: {
                pin: string;
                owner: {
                    id: string;
                    name: string;
                    image?: string | undefined;
                };
                maxPlayers: number;
                shortGameDeck: boolean;
                freeForAll: boolean;
                disableChat: boolean;
                passphrase?: string | undefined;
                randomisePlayerOrder: boolean;
                roundTimeout: number;
                status: "waiting" | "playing" | "finished";
                players: {
                    id: string;
                    name: string;
                    image?: string | undefined;
                }[];
                chat: {
                    name: string;
                    time: number;
                    owner?: string | undefined;
                    message: string;
                }[];
            };
            game?:
                | {
                      players: {
                          name: string;
                          deck:
                              | {
                                    type: "visible";
                                    cards: string[];
                                }
                              | {
                                    type: "hidden";
                                    size: number;
                                };
                          out: number | null;
                          turned: boolean;
                          beganRound: boolean;
                          action: "attack" | "defend" | "none";
                      }[];
                      tableTop: Record<string, string | null>;
                      deckSize: number;
                      trump: {
                          suit: string;
                          card: string;
                          value: number;
                      };
                  }
                | undefined;
        }) => void;
        lobbyState: (p1: {
            update:
                | {
                      type: "new_player";
                  }
                | {
                      type: "settings_update";
                  }
                | {
                      type: "player_exit";
                  }
                | {
                      type: "new_spectator";
                  };
            lobby: {
                pin: string;
                owner: {
                    id: string;
                    name: string;
                    image?: string | undefined;
                };
                maxPlayers: number;
                shortGameDeck: boolean;
                freeForAll: boolean;
                disableChat: boolean;
                passphrase?: string | undefined;
                randomisePlayerOrder: boolean;
                roundTimeout: number;
                status: "waiting" | "playing" | "finished";
                players: {
                    id: string;
                    name: string;
                    image?: string | undefined;
                }[];
                chat: {
                    name: string;
                    time: number;
                    owner?: string | undefined;
                    message: string;
                }[];
            };
        }) => void;
        countdown: () => void;
        start: () => void;
        message: (p1: { name: string; time: number; owner?: string | undefined; message: string }) => void;
        victory: (p1: {
            players: {
                name: string;
                at: Date;
            }[];
        }) => void;
        close: (p1: { reason: string; extra?: string | undefined }) => void;
        playerState: (p1: {
            update: {
                players: {
                    name: string;
                    deck:
                        | {
                              type: "visible";
                              cards: string[];
                          }
                        | {
                              type: "hidden";
                              size: number;
                          };
                    out: number | null;
                    turned: boolean;
                    beganRound: boolean;
                    action: "attack" | "defend" | "none";
                }[];
                tableTop: Record<string, string | null>;
                deckSize: number;
                trump: {
                    suit: string;
                    card: string;
                    value: number;
                };
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
                status: "waiting" | "playing" | "finished";
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
            };
        }) => void;
        error: (p1: {
            type: "internal" | "bad_request" | "not_found" | "unauthorized" | "invalid_move" | "stale_game";
            details?:
                | Record<
                      string,
                      {
                          message: string | string[];
                          code?: number | undefined;
                      }
                  >
                | undefined;
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
                  }
                | {
                      type: "forfeit";
                  },
        ) => void;
        start: (p1: string) => void;
        passphrase: (p1: string) => void;
    }
    /** @example const socket: Root.Socket = io(Root.path) */
    export type Socket = SocketBase<Emission, Actions>;
}
