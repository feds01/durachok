import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { LobbyNotFoundError } from "../../../controllers/common";
import { assert, expr, isDef } from "../../../utils";
import { ApiError } from "../../../utils/error";
import { ensureAuth } from "../common/auth";
import { factory } from "./ctx";

const onJoin = factory.build({
    event: "join",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, all, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        logger.info("join " + client.id);

        const [pin] = input;

        // @@Todo: support spectators, if we the game allows for spectators, and
        // if the game is currently in progress, we can send the specific connection
        // the spectator version of the game.

        const auth = ensureAuth(client);

        // we need to check that the user has permission to access this room.
        // if they don't, we should return an error.
        const hasAccess = ctx.lobbyService.hasAccess(auth.payload, pin);
        if (!hasAccess) {
            throw ApiError.http(401, "Unauthorized");
        }

        const name = expr(() => {
            if (auth.payload.kind === "registered") {
                return auth.payload.user.name;
            } else {
                return auth.payload.name;
            }
        });
        logger.info("user joining lobby name=" + name + "pin= " + pin);

        try {
            await ctx.lobbyService.confirmUser(pin, name, client.id);
        } catch (e: unknown) {
            if (e instanceof LobbyNotFoundError) {
                logger.warn(
                    "User tried to connect to lobby, but their entry couldn't be found.",
                    pin,
                    name,
                );
            } else {
                logger.warn("Error confirming user", e);
            }

            client.emit("close", {
                reason: "stale_token",
            });
            return;
        }

        const lobby = await ctx.lobbyService.get(pin);
        if (!lobby) {
            client.emit("close", {
                reason: "stale_game",
            });
            return;
        }
        // Emit to the current player, the game state.
        const game = await ctx.gameService(lobby).getGameStateFor(name);
        client.emit("join", {
            lobby,
            game,
        });

        // We need to send messages to all of the players that are in this
        // lobby, we send to all players with sockets.
        const clients = await all.getClients();
        const players = await ctx.lobbyService.getPlayers(pin);
        assert(isDef(players));

        players
            .filter((p) => p.socket)
            .forEach((p) => {
                // @@Slowness: we need to loop through all of the clients to find
                // the specific client, ideally we should be able to get just the
                // client directly by id?
                clients
                    .find((c) => c.id === p.socket)
                    ?.emit("lobbyState", {
                        update: {
                            type: "new_player",
                        },
                        lobby,
                    });
            });
    },
});

export default onJoin;
