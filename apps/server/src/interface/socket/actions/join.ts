import { GamePinSchema } from "@durachok/transport";
import { z } from "zod";

import { PlayerNotInLobbyError } from "../../../controllers/common";
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
        const { name, isOwner } = await ensureLobbyAccess(ctx, client, pin);

        logger.info({ ...meta, name }, "user joining lobby");

        try {
            await ctx.lobbyService.confirmUser(pin, name, client.id);
        } catch (e: unknown) {
            if (!(e instanceof PlayerNotInLobbyError)) {
                throw e;
            }

            logger.warn({ ...meta, name }, "User tried to connect to lobby, but their entry couldn't be found.");
            await client.emit("close", { reason: "stale_token" });
            return;
        }

        // Specify that this client is now within the lobby's room.
        await client.join(pin);

        // Send the player the lobby, and the game if one is being played, e.g. when
        // they rejoin. Only the owner sees the passphrase.
        const lobby = await ctx.lobbyService.get(pin, { withPassphrase: isOwner });
        await client.emit("join", {
            lobby,
            game: lobby.status === "playing" ? await ctx.gameService(lobby).getGameStateFor(name) : undefined,
        });

        await withRooms(pin).broadcast("lobbyState", {
            update: {
                type: "new_player",
            },
            lobby: await ctx.lobbyService.get(pin),
        });
    },
});

export default onJoin;
