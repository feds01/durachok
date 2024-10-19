import { Game } from "@durachok/engine/src";
import { PlayerGameState } from "@durachok/transport/src/schemas/game";
import { Lobby } from "@durachok/transport/src/schemas/lobby";
import { TRPCError } from "@trpc/server";
import { Logger } from "pino";

import Games, { IGame } from "../models/game.model";
import { DBGameSchema } from "../schemas/game";
import { CommonService } from "./common";

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

    /** Save the game to the database. */
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

    /** Add a player to the current game. */
    public async addPlayer(player: string): Promise<void> {
        const raw = await this.commonService.getGameDbObject(this.lobby.pin);

        // Add the player to the game.
        const game = await this.enrich(raw);
        game.addPlayer(player);

        // Finally, save the game.
        await this.save(raw.id, game);
    }

    /** Remove a player from the current game. */
    public async removePlayer(player: string): Promise<void> {
        const raw = await this.commonService.getGameDbObject(this.lobby.pin);

        // Remove the player from the game.
        const game = await this.enrich(raw);
        game.removePlayer(player);

        // Finally, save the game.
        await this.save(raw.id, game);
    }
}
