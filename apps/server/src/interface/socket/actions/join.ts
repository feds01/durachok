import { GamePinSchema } from "@durachok/transport";
import { z } from "zod";

import { LobbyNotFoundError } from "../../../controllers/common";
import { ensureLobbyAccess } from "../common/auth";
import { factory } from "./ctx";

const onJoin = factory.build({
    event: "join",
    input: z.tuple([GamePinSchema]),
    handler: async ({ input, client, withRooms, logger: $ctx }) => {
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

        const lobby = await ctx.lobbyService.get(pin);

        // @@Todo: make these automatic.
        if (!lobby) {
            client.emit("close", {
                reason: "stale_game",
            });
            return;
        }
        const game = await ctx.gameService(lobby);

        try {
            await ctx.lobbyService.confirmUser(pin, name, client.id);
            await game.addPlayer(name);
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

        // Specify that this client is now within the "lobby" room.
        client.join(lobby.pin);

        // Emit to the current player, the game state.
        client.emit("join", {
            lobby,
            game: await game.getGameStateFor(name),
        });

        withRooms("lobby").broadcast("lobbyState", {
            update: {
                type: "new_player",
            },
            lobby,
        });
    },
});

export default onJoin;
