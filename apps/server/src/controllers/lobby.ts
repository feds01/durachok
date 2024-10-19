import { CardSuits, shuffleArray } from "@durachok/engine/src";
import { GameSettings, LobbyInfo } from "@durachok/transport/src/request";
import { Lobby } from "@durachok/transport/src/schemas/lobby";
import { Player } from "@durachok/transport/src/schemas/user";
import { TRPCError } from "@trpc/server";
import { customAlphabet } from "nanoid";
import { Logger } from "pino";

import Lobbies, { PopulatedLobby } from "../models/lobby.model";
import { TokenPayload } from "../schemas/auth";
import { DBLobby, DBLobbySchema, DBPlayer } from "../schemas/lobby";
import { assert, isDef } from "../utils";
import { CommonService, LobbyNotFoundError } from "./common";
import { ImageService } from "./image";

export class LobbyService {
    public constructor(
        private readonly logger: Logger,
        private commonService: CommonService,
        private imageService: ImageService,
    ) {}

    /** Generate a new game pin. */
    private async newGamePin(): Promise<string> {
        const alphabet = customAlphabet("1234567890", 6);
        let candidate = alphabet();

        // ##Hack: Very unlikely to happen, but just in case we have a collision.
        while (isDef(await Lobbies.findOne({ pin: candidate }))) {
            candidate = alphabet();
        }

        return candidate;
    }

    /** Generate a new game passphrase */
    private newGamePassphrase(): string {
        const suites = Object.values(CardSuits);
        shuffleArray(suites);
        return suites.join("");
    }

    /** Get an enriched Lobby object. */
    private async enrich(lobby: PopulatedLobby): Promise<DBLobby> {
        const result = await DBLobbySchema.safeParseAsync(lobby.toObject());

        if (result.success) {
            return result.data;
        }

        this.logger.error("Failed to parse lobby:\n" + result.error);
        throw new Error("Could not parse lobby");
    }

    /** Convert a lobby object into a lobby info object. */
    private lobbyIntoInfo(lobby: DBLobby): LobbyInfo {
        return {
            pin: lobby.pin,
            joinable:
                lobby.status === "waiting" &&
                lobby.players.length < lobby.maxPlayers,
            passphrase: isDef(lobby.passphrase),
            players: lobby.players.length,
            maxPlayers: lobby.maxPlayers,
            status: lobby.status,
        };
    }

    private async getUserAsPlayer(userId: string): Promise<Player> {
        const user = await this.commonService.getUserDbObject(userId);

        return {
            name: user.name,
            id: user.id,
            image: await this.imageService.getUserImage(user.id),
        };
    }

    /**
     * Convert a lobby into the lobby state object.
     *
     * @@Todo: perhaps unify the `LobbyInfo` and the `LobbyState` objects.
     */
    private async lobbyIntoState(lobby: DBLobby): Promise<Lobby> {
        return {
            pin: lobby.pin,
            /** Settings */
            maxPlayers: lobby.maxPlayers,
            shortGameDeck: lobby.shortGameDeck,
            freeForAll: lobby.freeForAll,
            disableChat: lobby.disableChat,
            randomisePlayerOrder: lobby.randomisePlayerOrder,
            roundTimeout: lobby.roundTimeout,

            /** State */
            status: lobby.status,
            chat: lobby.chat,
            players: await Promise.all(
                lobby.players
                    .filter((p) => p.socket)
                    .map(async (p) => {
                        if (p.registered) {
                            return this.getUserAsPlayer(p.registered);
                        } else {
                            return {
                                name: p.name,
                                registered: null,
                                id: p.name,
                            };
                        }
                    }),
            ),
            owner: await this.getUserAsPlayer(lobby.owner.id),
        };
    }

    /** Check if a user has access to a lobby. */
    public async hasAccess(token: TokenPayload, pin: string): Promise<boolean> {
        if (token.kind === "registered") {
            return await this.isUserInLobby(pin, token.user.name);
        } else {
            // @@Todo: There is a potential problem, if a lobby pin is re-used within
            // the expiration time of the token, then the user could join the new
            // lobby without the owner's permission or without going through the standard
            // join process. Mitigation is to parametrise the token over the `id` of the
            // lobby which should be unique.
            return token.pin === pin;
        }
    }

    /**
     * Check if the user has owner right s to a lobby.
     *
     * @param token - The token of the user.
     * @param pin - The pin of the lobby.
     *
     * @returns Whether the user has owner access to the lobby.
     */
    public async hasOwnerAccess(
        token: TokenPayload,
        pin: string,
    ): Promise<boolean> {
        if (token.kind === "registered") {
            return isDef(await Lobbies.findOne({ pin, owner: token.user.id }));
        } else {
            return false;
        }
    }

    /**
     * Check whether a user is within a lobby.
     *
     * @param pin - The pin of the lobby.
     * @param name - The name of the user.
     * @param userId - The user's ID, if they are registered.
     *
     * @returns Whether the user is in the lobby.
     * */
    public async isUserInLobby(
        pin: string,
        name: string,
        userId?: string,
    ): Promise<boolean> {
        return isDef(
            await Lobbies.findOne({
                pin,
                $or: [
                    { "players.name": name },
                    ...(userId ? [{ "players.registered": userId }] : []),
                ],
            }),
        );
    }

    /** Get a lobby in the "DB" format. */
    private async getRaw(pin: string): Promise<DBLobby | undefined> {
        const game = await Lobbies.findOne({ pin })
            .populate<Pick<PopulatedLobby, "owner">>("owner")
            .exec();

        if (!isDef(game)) {
            this.logger.warn("Failed to find lobby with pin: " + pin);
            return undefined;
        }

        return await this.enrich(game);
    }

    /** Get a lobby state. */
    public async get(pin: string): Promise<Lobby | undefined> {
        const lobby = await this.getRaw(pin);

        if (!isDef(lobby)) {
            throw new LobbyNotFoundError();
        }

        return this.lobbyIntoState(lobby);
    }

    /** Get basic information about a lobby. */
    public async getInfo(pin: string): Promise<LobbyInfo | undefined> {
        const lobby = await this.getRaw(pin);
        if (!isDef(lobby)) {
            throw new LobbyNotFoundError();
        }

        return this.lobbyIntoInfo(lobby);
    }

    /** Get all of the players that are currently in the lobby */
    public async getPlayers(pin: string): Promise<DBPlayer[]> {
        const lobby = await this.getRaw(pin);
        if (!isDef(lobby)) {
            throw new LobbyNotFoundError();
        }

        return lobby.players;
    }

    /** Get all lobbies by a given user */
    public async getByOwner(userId: string): Promise<LobbyInfo[]> {
        const items = await Lobbies.find({ owner: userId }).populate<
            Pick<PopulatedLobby, "owner">
        >("owner");
        const lobbies = await Promise.all(items.map((i) => this.enrich(i)));
        return lobbies.map(this.lobbyIntoInfo);
    }

    /** Add a user to the current lobby. */
    public async addUserTo(pin: string, player: DBPlayer): Promise<void> {
        const lobby = await this.getRaw(pin);
        assert(isDef(lobby), "modifying non-existant lobby.");

        // find an un-honoured connection entry and overwrite it, otherwise we
        // can just append the connection
        if (lobby.players.length === lobby.maxPlayers) {
            const idx = lobby.players.findIndex((player) => !player.confirmed);
            lobby.players[idx] = player;
        } else {
            lobby.players.push(player);
        }

        // We need to update the lobby in the database.
        await Lobbies.updateOne(
            { pin },
            {
                $set: {
                    players: lobby.players,
                },
            },
        );
    }

    /** Confirm that the user is playing in the lobby. */
    public async confirmUser(
        pin: string,
        name: string,
        socket: string,
    ): Promise<void> {
        const lobby = await this.getRaw(pin);
        assert(isDef(lobby), "modifying non-existant lobby.");

        const players = lobby.players;
        const idx = players.findIndex((player) => player.name === name);

        if (idx < 0) {
            throw new LobbyNotFoundError();
        }

        // Now, we should update the player's entry to say that they've confirmed
        // their connection to the lobby.
        players[idx] = {
            ...players[idx],
            socket,
            confirmed: true,
        };

        // We need to update the lobby in the database.
        await Lobbies.updateOne(
            { pin },
            {
                $set: {
                    players: lobby.players,
                },
            },
        );
    }

    /**
     * Create a new lobby with the given `user` as the owner and the provided game settings.
     * */
    public async create(
        userId: string,
        settings: GameSettings,
    ): Promise<{ pin: string }> {
        const {
            maxPlayers,
            passphrase,
            shortGameDeck,
            freeForAll,
            disableChat,
            randomisePlayerOrder,
            roundTimeout,
        } = settings;

        const pin = await this.newGamePin();
        const owner = await this.commonService.getUserDbObject(userId);

        try {
            const ownerAsPlayer = {
                name: owner.name,
                socket: null,
                confirmed: true,
                registered: userId,
            };
            const lobby = new Lobbies({
                pin,
                maxPlayers,
                ...(passphrase ? { passphrase: this.newGamePassphrase() } : {}),
                shortGameDeck,
                freeForAll,
                disableChat,
                randomisePlayerOrder,
                roundTimeout,
                status: "waiting",
                // Automatically add the owner to the lobby.
                players: [ownerAsPlayer],
                owner: userId,
                chat: [],
            });

            await lobby.save();

            return {
                pin,
            };
        } catch (e: unknown) {
            this.logger.error("Failed to create lobby", e);
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }

    /** Delete a lobby by PIN. */
    public async delete(pin: string): Promise<void> {
        try {
            await Lobbies.deleteOne({ pin });

            // @@Todo: socket events!
            // kick everyone from the lobby if any connections are present.
            // emitLobbyEvent(pin, ClientEvents.CLOSE, { reason: "lobby_closed" });
        } catch (e: unknown) {
            this.logger.error("Failed to delete lobby", e);
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }
}
