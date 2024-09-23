import { Game } from "@durachok/engine/src";
import {
    GameSchema,
    PlayerGameState,
} from "@durachok/transport/src/schemas/game";
import { Lobby } from "@durachok/transport/src/schemas/lobby";
import { Logger } from "pino";

import { IGame } from "../models/game.model";
import { CommonService } from "./common";
import { LobbyService } from "./lobby";

/** Service to orchestrate and manage a game.  */
export class GameService {
    public constructor(
        private readonly lobby: Lobby,
        private readonly logger: Logger,
        private readonly commonService: CommonService,
        private readonly lobbyService: LobbyService,
    ) {}

    /** Get an enriched Lobby object. */
    private async enrich(game: IGame): Promise<Game> {
        const result = await GameSchema.safeParseAsync(game.toObject());
        if (!result.success) {
            // @@Todo: add logging about why...
            this.logger.error("Failed to parse game:\n", result.error);
            throw new Error("Could not parse game");
        }

        const history = result.data.history ?? {
            nodes: [],
            state: result.data.state,
        };

        return Game.fromState(result.data.state, history, this.lobby);
    }

    /** Get a game state for a specific player. */
    public async getGameStateFor(player: string): Promise<PlayerGameState> {
        const gameObject = await this.commonService.getGameDbObject(
            this.lobby.pin,
        );
        const game = await this.enrich(gameObject);
        return game.getStateForPlayer(player);
    }
}
