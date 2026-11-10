import { ClientEvents } from "@durachok/transport";

import { PlayerNotInLobbyError } from "../../../controllers/common";
import { ensureLobbyAccess } from "../common/auth";
import { context } from "../context";
import { factory } from "./ctx";

const onJoin = factory.build({
    event: "join",
    input: ClientEvents.join,
    handler: async ({ input, client, withRooms, logger }) => {
        const [pin] = input;
        const meta = { event: "join", pin, clientId: client.id };
        logger.info(meta, "processing event");

        // @@Todo: support spectators, if we the game allows for spectators, and
        // if the game is currently in progress, we can send the specific connection
        // the spectator version of the game.
        const { name, isOwner } = await ensureLobbyAccess(context, client, pin);

        logger.info({ ...meta, name }, "user joining lobby");

        try {
            await context.lobbyService.confirmUser(pin, name, client.id);
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
        const lobby = await context.lobbyService.get(pin, { withPassphrase: isOwner });
        const game = lobby.status === "playing" ? await context.gameService(lobby).getGameStateFor(name) : undefined;
        await client.emit("join", { lobby, ...(game && { game: game.update, gameVersion: game.version }) });

        await withRooms(pin).broadcast("lobbyState", {
            update: {
                type: "new_player",
            },
            lobby: await context.lobbyService.get(pin),
        });
    },
});

export default onJoin;
