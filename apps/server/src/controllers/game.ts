import { Game } from "@durachok/engine";
import { PlayerGameState, PlayerMove } from "@durachok/transport";
import { Lobby } from "@durachok/transport";
import { TRPCError } from "@trpc/server";
import { Logger } from "pino";

import { withLock } from "../lib/database";
import Games, { IGame } from "../models/game.model";
import { DBGameSchema } from "../schemas/game";
import {
    CommonService,
    InvalidMoveError,
    PlayerNotInLobbyError,
} from "./common";

/** An exception that indicates that a game already exists for a certain lobby. */
export class GameAlreadyExists extends TRPCError {
    public constructor() {
        super({
            code: "BAD_REQUEST",
            message: "A game already exists for this lobby",
        });
    }
}

/** Service to orchestrate and manage a game.  */
export class GameService {
    public constructor(
        private readonly lobby: Lobby,
        private readonly logger: Logger,
        private readonly commonService: CommonService,
    ) {}

    /** Get an enriched Lobby object. */
    private async enrich(game: IGame): Promise<Game> {
        const result = await DBGameSchema.safeParseAsync(game.toObject());
        if (!result.success) {
            // @@Todo: add logging about why...
            this.logger.error("Failed to parse game:\n" + result.error);
            throw new Error("Could not parse game");
        }

        const history = result.data.history ?? {
            nodes: [],
            state: result.data.state,
        };

        const state = {
            ...result.data.state,
            tableTop: Object.fromEntries(result.data.state.tableTop.entries()),
            players: Object.fromEntries(result.data.state.players.entries()),
        };

        return Game.fromState(state, history, this.lobby);
    }

    public async get(): Promise<Game> {
        const game = await this.commonService.getGameDbObject(this.lobby.pin);
        return this.enrich(game);
    }

    /** Get a game state for a specific player. */
    public async getGameStateFor(player: string): Promise<PlayerGameState> {
        const gameObject = await this.commonService.getGameDbObject(
            this.lobby.pin,
        );
        const game = await this.enrich(gameObject);
        return game.getStateForPlayer(player);
    }

    /** Create a new game for the given lobby. */
    public async create(owner: string): Promise<Game> {
        const lobby = await this.commonService.getLobbyDbObject(this.lobby.pin);

        // Games can only be created if the lobby is in a "waiting" state.
        if (lobby.status !== "waiting") {
            throw new GameAlreadyExists();
        }

        const game = new Game([owner], null);
        await this.save(lobby.id, game);

        return game;
    }

    /**
     * Save the game to the database.
     *
     * @param id The ID of the game.
     * @param game The game to save.
     * */
    private async save(id: string, game: Game): Promise<void> {
        const raw = game.serialize();

        try {
            await Games.findByIdAndUpdate(id, raw, { upsert: true });
        } catch (e: unknown) {
            this.logger.error("Failed to save game", e);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to save game",
            });
        }
    }

    /**
     * Add a player to the current game.
     *
     * @param player The player to add.
     * */
    public async addPlayer(player: string): Promise<void> {
        const raw = await this.commonService.getGameDbObject(this.lobby.pin);
        const game = await this.enrich(raw);

        // Add the player to the game.
        withLock(this.lobby.pin, async () => {
            game.addPlayer(player);

            // Finally, save the game.
            await this.save(raw.id, game);
        });
    }

    /**
     * Remove a player from the current game.
     *
     * @param player The player to remove.
     * */
    public async removePlayer(player: string): Promise<void> {
        const raw = await this.commonService.getGameDbObject(this.lobby.pin);
        const game = await this.enrich(raw);

        // Remove the player from the game.
        withLock(this.lobby.pin, async () => {
            game.removePlayer(player);

            // Finally, save the game.
            await this.save(raw.id, game);
        });
    }

    /**
     * Make a move on the player.
     *
     * @param name The player to make the move for.
     * @param move The move to make.
     *
     * @returns The updated game state.
     * */
    public async makeMove(name: string, move: PlayerMove): Promise<Game> {
        const raw = await this.commonService.getGameDbObject(this.lobby.pin);
        const game = await this.enrich(raw);

        const player = game.getPlayer(name);

        if (!player) {
            throw new PlayerNotInLobbyError();
        }

        // Perform the game move
        return await withLock(this.lobby.pin, async () => {
            switch (player.action) {
                case "attack": {
                    switch (move.type) {
                        case "place": {
                            game.addCardToTableTop(name, move.card);
                            break;
                        }
                        case "forfeit": {
                            game.finalisePlayerTurn(name);
                            break;
                        }
                        case "cover": {
                            this.logger.warn(
                                "Can't cover a card when attacking",
                            );
                            throw new InvalidMoveError(
                                "Can't cover a card when attacking",
                            );
                        }
                    }

                    return game;
                }
                case "defend": {
                    switch (move.type) {
                        case "forfeit": {
                            game.finalisePlayerTurn(name);
                            break;
                        }
                        case "place": {
                            game.addCardToTableTop(name, move.card);
                            break;
                        }
                        case "cover": {
                            game.coverCardOnTableTop(move.card, move.position);
                            break;
                        }
                    }

                    return game;
                }
                case "none": {
                    this.logger.warn(
                        "Can't perform action on player with no role",
                    );
                    throw new InvalidMoveError(
                        "Can't perform action on player with no role",
                    );
                }
            }
        });
    }

    /** Start a game. */
    public async start(): Promise<void> {
        const raw = await this.commonService.getGameDbObject(this.lobby.pin);

        // Start the game.
        const game = await this.enrich(raw);
        game.status = "playing";

        // Finally, save the game.
        await this.save(raw.id, game);
    }
}
