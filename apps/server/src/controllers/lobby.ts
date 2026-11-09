import { CardSuits } from "@durachok/engine";
import { GameSettings, LobbyInfo } from "@durachok/transport";
import { GameStatus } from "@durachok/transport";
import { Lobby, Message } from "@durachok/transport";
import { PASSPHRASE_LENGTH, Player } from "@durachok/transport";
import { TRPCError } from "@trpc/server";
import { randomInt } from "node:crypto";
import { customAlphabet } from "nanoid";
import { Logger } from "pino";

import { transaction } from "../lib/database";
import { CHAT_HISTORY, MAX_LOBBIES_PER_OWNER } from "../lib/limits";
import Lobbies, { PopulatedLobbyDocument, PopulatedLobbyFields } from "../models/lobby.model";
import { TokenPayload } from "../schemas/auth";
import { DBLobby, DBLobbySchema, DBPlayer, identityOf, isPlayer } from "../schemas/lobby";
import { assert, expr, isDef } from "../utils";
import {
    CommonService,
    InvalidLobbySettingsError,
    InvalidLobbyStateError,
    KickedFromLobbyError,
    LobbyFullError,
    LobbyNotFoundError,
    PlayerAlreadyInLobbyError,
    PlayerNotInLobbyError,
    TooManyLobbiesError,
} from "./common";
import { ImageService } from "./image";

/** Options for reading a lobby's state. */
interface LobbyStateOptions {
    /** Whether to include the passphrase, which only the owner may see. */
    withPassphrase?: boolean;
}

export class LobbyService {
    public constructor(
        private readonly logger: Logger,
        private commonService: CommonService,
        private imageService: ImageService,
    ) {}

    /** Generate a new game pin, which no lobby has. */
    private async newGamePin(): Promise<string> {
        const alphabet = customAlphabet("1234567890", 6);

        // A pin that a lobby has already is rare, and a run of them means that the pins are
        // nearly all taken, which stops here, rather than looking for ever.
        for (let attempt = 0; attempt < 20; attempt++) {
            const candidate = alphabet();
            if (!(await Lobbies.exists({ pin: candidate }))) {
                return candidate;
            }
        }

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Couldn't find a free pin" });
    }

    /**
     * Generate a new game passphrase, of suits at random, in which a suit can come up more than
     * once, @see PASSPHRASE_LENGTH.
     */
    private newGamePassphrase(): string {
        const suits = Object.values(CardSuits);
        return Array.from({ length: PASSPHRASE_LENGTH }, () => suits[randomInt(suits.length)]).join("");
    }

    /** Get an enriched Lobby object. */
    private async enrich(lobby: PopulatedLobbyDocument): Promise<DBLobby> {
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
            joinable: lobby.status === "waiting" && lobby.players.length < lobby.maxPlayers,
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
     * Convert a lobby into the lobby state object, for the players in it. A dashboard lists a
     * player's lobbies as `LobbyInfo` instead, which counts the players and leaves out the chat.
     */
    private async lobbyIntoState(lobby: DBLobby, { withPassphrase = false }: LobbyStateOptions = {}): Promise<Lobby> {
        return {
            pin: lobby.pin,
            /** Settings */
            hasPassphrase: isDef(lobby.passphrase),
            ...(withPassphrase && isDef(lobby.passphrase) ? { passphrase: lobby.passphrase } : {}),
            maxPlayers: lobby.maxPlayers,
            shortGameDeck: lobby.shortGameDeck,
            freeForAll: lobby.freeForAll,
            disableChat: lobby.disableChat,
            randomisePlayerOrder: lobby.randomisePlayerOrder,
            roundTimeout: lobby.roundTimeout,
            mythicMode: lobby.mythicMode,

            /** State */
            version: lobby.version,
            status: lobby.status,
            chat: lobby.chat,
            // The players who confirmed their place: the owner, and everyone who connected.
            players: await Promise.all(
                lobby.players
                    .filter((p) => p.confirmed)
                    .map((p) => {
                        if (p.registered) {
                            return this.getUserAsPlayer(p.registered);
                        }
                        if (p.bot) {
                            return { name: p.name, id: p.bot, bot: true };
                        }
                        return {
                            name: p.name,
                            registered: null,
                            id: p.name,
                        };
                    }),
            ),
            owner: await this.getUserAsPlayer(lobby.owner.id),
        };
    }

    /**
     * Find the player that a token belongs to in a lobby: a registered user by their
     * account, a bot by its entry in the registry, and an anonymous player by the name and
     * lobby that their token is for.
     */
    public async findPlayer(token: TokenPayload, pin: string): Promise<DBPlayer | undefined> {
        // An anonymous player's tokens are for one place in one lobby. The secret of the place
        // keeps them from another lobby that has the same pin later, @see DBPlayer.seat.
        if (token.kind === "anonymous" && token.pin !== pin) {
            return undefined;
        }

        const lobby = await this.getRaw(pin);
        return lobby?.players.find((player) => isPlayer(token, player));
    }

    /** Check if a user has access to a lobby, i.e. they are one of its players. */
    public async hasAccess(token: TokenPayload, pin: string): Promise<boolean> {
        return isDef(await this.findPlayer(token, pin));
    }

    /**
     * Check if the user has owner right s to a lobby.
     *
     * @param token - The token of the user.
     * @param pin - The pin of the lobby.
     *
     * @returns Whether the user has owner access to the lobby.
     */
    public async hasOwnerAccess(token: TokenPayload, pin: string): Promise<boolean> {
        if (token.kind === "registered") {
            return isDef(await Lobbies.findOne({ pin, owner: token.user.id }));
        }
        return false;
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
    public async isUserInLobby(pin: string, name: string, userId?: string): Promise<boolean> {
        return isDef(
            await Lobbies.findOne({
                pin,
                $or: [{ "players.name": name }, ...(userId ? [{ "players.registered": userId }] : [])],
            }),
        );
    }

    /** Get a lobby in the "DB" format. */
    private async getRaw(pin: string): Promise<DBLobby | undefined> {
        const game = await Lobbies.findOne({ pin }).populate<Pick<PopulatedLobbyFields, "owner">>("owner").exec();

        if (!isDef(game)) {
            this.logger.warn("Failed to find lobby with pin: " + pin);
            return undefined;
        }

        return await this.enrich(game);
    }

    /** Get a lobby state. */
    public async get(pin: string, options: LobbyStateOptions = {}): Promise<Lobby> {
        const lobby = await this.getRaw(pin);
        if (!isDef(lobby)) {
            throw new LobbyNotFoundError();
        }

        return this.lobbyIntoState(lobby, options);
    }

    /** Check a passphrase against a lobby's, which is correct if the lobby has none. */
    public async checkPassphrase(pin: string, passphrase: string | undefined): Promise<boolean> {
        const lobby = await this.getRaw(pin);
        if (!isDef(lobby)) {
            throw new LobbyNotFoundError();
        }

        return !isDef(lobby.passphrase) || lobby.passphrase === passphrase;
    }

    /** Get the status of a lobby. */
    public async getStatus(pin: string): Promise<GameStatus> {
        const lobby = await this.getRaw(pin);
        if (!isDef(lobby)) {
            throw new LobbyNotFoundError();
        }

        return lobby.status;
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
        const items = await Lobbies.find({ owner: userId }).populate<Pick<PopulatedLobbyFields, "owner">>("owner");
        const lobbies = await Promise.all(items.map((i) => this.enrich(i)));
        return lobbies.map(this.lobbyIntoInfo);
    }

    /** Add a user to a waiting lobby, if it has a free place, and nobody in it has their name, account or bot. */
    public async addUserTo(pin: string, player: DBPlayer): Promise<void> {
        await transaction(async () => {
            const lobby = await this.getRaw(pin);
            if (!isDef(lobby)) {
                throw new LobbyNotFoundError();
            }

            if (lobby.status !== "waiting" || lobby.players.length >= lobby.maxPlayers) {
                throw new LobbyFullError();
            }

            if (lobby.kicked.includes(identityOf(player))) {
                throw new KickedFromLobbyError();
            }

            const taken = lobby.players.some(
                (other) =>
                    other.name === player.name ||
                    (isDef(player.registered) && other.registered === player.registered) ||
                    (isDef(player.bot) && other.bot === player.bot),
            );
            if (taken) {
                throw new PlayerAlreadyInLobbyError();
            }

            await Lobbies.updateOne({ pin }, { $push: { players: player } });
        });
    }

    /** Confirm that the user is playing in the lobby, from the given connection. */
    public async confirmUser(pin: string, name: string, socket: string): Promise<void> {
        const { matchedCount } = await Lobbies.updateOne(
            { pin, "players.name": name },
            { $set: { "players.$.socket": socket, "players.$.confirmed": true } },
        );

        if (matchedCount === 0) {
            throw new PlayerNotInLobbyError();
        }
    }

    /**
     * Remove a player from a waiting lobby. The owner can't be removed. A player whom the owner
     * kicks out can't join the lobby again, @see identityOf.
     *
     * @returns The removed player, e.g. to notify their connection.
     */
    public async removePlayer(pin: string, name: string, { kick = false } = {}): Promise<DBPlayer> {
        return transaction(async () => {
            const lobby = await this.getRaw(pin);
            if (!isDef(lobby)) {
                throw new LobbyNotFoundError();
            }

            if (lobby.status !== "waiting") {
                throw new InvalidLobbyStateError("Players can only leave a lobby before the game starts");
            }

            const player = lobby.players.find((p) => p.name === name);
            if (!isDef(player)) {
                throw new PlayerNotInLobbyError();
            }

            if (player.registered === lobby.owner.id) {
                throw new InvalidLobbyStateError("The owner can't leave their lobby");
            }

            await Lobbies.updateOne(
                { pin },
                { $pull: { players: { name } }, ...(kick && { $addToSet: { kicked: identityOf(player) } }) },
            );
            return player;
        });
    }

    /**
     * Handle a connection closing. A player in a waiting lobby gives up their place,
     * except the owner, but a player in a game keeps it, so that they can rejoin.
     *
     * @returns The pin of the lobby that the connection was in, if any.
     */
    public async disconnect(socket: string): Promise<string | undefined> {
        return transaction(async () => {
            const lobby = await Lobbies.findOne({ "players.socket": socket });
            if (!isDef(lobby)) {
                return undefined;
            }

            const player = lobby.players.find((p) => p.socket === socket);
            const isOwner = player?.registered === lobby.owner.toString();

            if (lobby.status === "waiting" && !isOwner) {
                await Lobbies.updateOne({ pin: lobby.pin }, { $pull: { players: { socket } } });
            } else {
                await Lobbies.updateOne(
                    { pin: lobby.pin, "players.socket": socket },
                    { $set: { "players.$.socket": null } },
                );
            }

            return lobby.pin;
        });
    }

    /**
     * Mark a waiting lobby as playing. Only the players who are connected take part,
     * so everyone else loses their place.
     *
     * @returns The names of the players in the game.
     */
    public async startGame(pin: string): Promise<string[]> {
        return transaction(async () => {
            const lobby = await this.getRaw(pin);
            if (!isDef(lobby)) {
                throw new LobbyNotFoundError();
            }

            if (lobby.status !== "waiting") {
                throw new InvalidLobbyStateError("The game has already started");
            }

            const players = lobby.players.filter((p) => p.confirmed && isDef(p.socket));
            if (players.length < 2) {
                throw new InvalidLobbyStateError("A game needs at least two connected players");
            }

            await Lobbies.updateOne({ pin }, { $set: { status: "playing", players } });
            return players.map((p) => p.name);
        });
    }

    /**
     * Mark a lobby as waiting again, after its game finished, so that its players can play another.
     * A player who left during the game kept their place in it, so that they could come back, and
     * gives it up now, as they would have in the waiting room, except the owner.
     */
    public async finishGame(pin: string): Promise<void> {
        const lobby = await Lobbies.findOne({ pin }, { owner: 1 });
        if (!isDef(lobby)) {
            throw new LobbyNotFoundError();
        }

        await Lobbies.updateOne(
            { pin },
            {
                $set: { status: "waiting" },
                $pull: { players: { socket: null, registered: { $ne: lobby.owner.toString() } } },
            },
        );
    }

    /**
     * Send a message from a player to the lobby chat.
     *
     * @param pin - The pin of the lobby.
     * @param socket - The socket of the player.
     * @param message - The message to send.
     */
    public async sendMessage(pin: string, socket: string, message: string): Promise<Message> {
        const lobby = await this.getRaw(pin);
        assert(isDef(lobby), "modifying non-existant lobby.");

        if (lobby.disableChat) {
            throw new InvalidLobbyStateError("Chat is disabled in this lobby");
        }

        const players = lobby.players;
        const idx = players.findIndex((player) => player.socket === socket);

        if (idx < 0) {
            throw new PlayerNotInLobbyError();
        }

        const player = players[idx]!;

        const payload: Message = {
            message,
            time: Date.now(),
            name: player.name,
            owner: expr(() => {
                if (player.registered) {
                    return player.registered;
                }
            }),
        };

        // The lobby keeps only its newest messages, so that a chat can't outgrow its document.
        await Lobbies.updateOne({ pin }, { $push: { chat: { $each: [payload], $slice: -CHAT_HISTORY } } });

        return payload;
    }

    /**
     * Create a new lobby with the given `user` as the owner and the provided game settings.
     * */
    public async create(userId: string, settings: GameSettings): Promise<{ pin: string }> {
        const {
            maxPlayers,
            passphrase,
            shortGameDeck,
            freeForAll,
            disableChat,
            randomisePlayerOrder,
            roundTimeout,
            mythicMode,
        } = settings;

        if ((await Lobbies.countDocuments({ owner: userId })) >= MAX_LOBBIES_PER_OWNER) {
            throw new TooManyLobbiesError(MAX_LOBBIES_PER_OWNER);
        }

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
                mythicMode,
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
            this.logger.error(e, "Failed to create lobby");
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }

    /** Delete a lobby by PIN. */
    public async delete(pin: string): Promise<void> {
        try {
            await Lobbies.deleteOne({ pin });
        } catch (e: unknown) {
            this.logger.error(e, "Failed to delete lobby");
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
    }

    /**
     * Change the settings of a lobby that is waiting for its game. Turning the passphrase on
     * gives the lobby one, or keeps the one it has, and turning it off removes it.
     */
    public async updateSettings(pin: string, settings: GameSettings): Promise<void> {
        await transaction(async () => {
            const lobby = await this.getRaw(pin);
            if (!isDef(lobby)) {
                throw new LobbyNotFoundError();
            }

            if (lobby.status !== "waiting") {
                throw new InvalidLobbyStateError("The settings can only change before the game starts");
            }

            if (lobby.players.length > settings.maxPlayers) {
                throw new InvalidLobbySettingsError("The lobby already has more players than that");
            }

            const { passphrase, ...rest } = settings;
            await Lobbies.updateOne(
                { pin },
                passphrase
                    ? { $set: { ...rest, passphrase: lobby.passphrase ?? this.newGamePassphrase() } }
                    : { $set: rest, $unset: { passphrase: 1 } },
            );
        });
    }

    /** Give a lobby a new passphrase, if it has one and is waiting for its game. */
    public async rotatePassphrase(pin: string): Promise<void> {
        const result = await Lobbies.updateOne(
            { pin, status: "waiting", passphrase: { $exists: true } },
            { $set: { passphrase: this.newGamePassphrase() } },
        );

        if (result.matchedCount === 0) {
            throw new InvalidLobbyStateError("The lobby has no passphrase, or its game has started");
        }
    }
}
