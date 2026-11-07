import { Game } from "@durachok/engine";
import { Action, PlayerGameState, PlayerMove } from "@durachok/transport";
import { Lobby } from "@durachok/transport";
import { TRPCError } from "@trpc/server";
import { Logger } from "pino";

import { withLock } from "../lib/database";
import Games, { GameDocument } from "../models/game.model";
import { DBGameSchema } from "../schemas/game";
import { CommonService, InvalidMoveError, PlayerNotInLobbyError } from "./common";

/** The result of a move: the game after it, and the actions that it caused. */
export interface MoveResult {
    game: Game;
    actions: Action[];
}

/** Service to orchestrate and manage a game.  */
export class GameService {
    public constructor(
        private readonly lobby: Lobby,
        private readonly logger: Logger,
        private readonly commonService: CommonService,
    ) {}

    /** Get an enriched Lobby object. */
    private async enrich(game: GameDocument): Promise<Game> {
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
        const game = await this.get();
        return game.getStateForPlayer(player);
    }

    /**
     * Create the game for the lobby, with the given players and the lobby's settings,
     * replacing any game that it played before.
     */
    public async create(players: string[]): Promise<Game> {
        const [first, ...rest] = players;
        if (!first) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "A game needs players" });
        }

        const lobby = await this.commonService.getLobbyDbObject(this.lobby.pin);
        const game = new Game([first, ...rest], null, this.lobby);
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
            if (e instanceof Error) {
                this.logger.error(`Failed to save game: ${e.message}\n${e.stack}`);
            }

            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to save game",
            });
        }
    }

    /**
     * Make a move for a player, and save the game. The game is read, changed and saved
     * under the lobby's lock, so that moves from several players apply one at a time.
     *
     * @param name The player to make the move for.
     * @param move The move to make.
     *
     * @returns The updated game, and the actions that the move caused.
     * */
    public async makeMove(name: string, move: PlayerMove): Promise<MoveResult> {
        return withLock(`game:${this.lobby.pin}`, async () => {
            const raw = await this.commonService.getGameDbObject(this.lobby.pin);
            const game = await this.enrich(raw);

            if (game.isFinished()) {
                throw new InvalidMoveError("The game has finished");
            }

            if (!game.players.has(name)) {
                throw new PlayerNotInLobbyError();
            }

            const player = game.getPlayer(name);
            const before = game.history.serialize().nodes.length;

            switch (player.action) {
                case "attack": {
                    switch (move.type) {
                        case "place":
                            game.addCardToTableTop(name, move.card);
                            break;
                        case "forfeit":
                            game.finalisePlayerTurn(name);
                            break;
                        case "cover":
                            throw new InvalidMoveError("Can't cover a card when attacking");
                    }
                    break;
                }
                case "defend": {
                    switch (move.type) {
                        case "forfeit":
                            game.finalisePlayerTurn(name);
                            break;
                        case "place":
                            game.addCardToTableTop(name, move.card);
                            break;
                        case "cover":
                            game.coverCardOnTableTop(move.card, move.position);
                            break;
                    }
                    break;
                }
                case "none":
                    throw new InvalidMoveError("Can't make a move yet");
            }

            await this.save(raw.id, game);
            return { game, actions: game.history.serialize().nodes.slice(before) };
        });
    }
}
