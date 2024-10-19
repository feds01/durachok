import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { LobbyNotFoundError } from "../../../controllers/common";
import { assert, expr, isDef } from "../../../utils";
import { ensureLobbyAccess } from "../common/auth";
import { factory } from "./ctx";

const onJoin = factory.build({
    event: "join",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, all, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;

        const [pin] = input;
        const meta = { event: "join", pin, clientId: client.id };
        logger.info(meta, "processing event");

        // @@Todo: support spectators, if we the game allows for spectators, and
        // if the game is currently in progress, we can send the specific connection
        // the spectator version of the game.
        const { name } = await ensureLobbyAccess(ctx, client, pin);

        logger.info({ ...meta, name }, "user joining lobby");

        try {
            await ctx.lobbyService.confirmUser(pin, name, client.id);
        } catch (e: unknown) {
            if (e instanceof LobbyNotFoundError) {
                logger.warn(
                    { ...meta, name },
                    "User tried to connect to lobby, but their entry couldn't be found.",
                );
            } else {
                logger.warn(meta, "Error confirming user", e);
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
