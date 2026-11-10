import { ClientEvents } from "@durachok/transport";

import { PlayerNotInLobbyError } from "../../../controllers/common";
import { ApiError } from "../../../utils/error";
import { ensureAuth, ensureLobbyAccess } from "../common/auth";
import { context } from "../context";
import { factory } from "./ctx";

const onJoin = factory.build({
    event: "join",
    input: ClientEvents.join,
    handler: async ({ input, client, withRooms, logger }) => {
        const [pin] = input;
        const meta = { event: "join", pin, clientId: client.id };
        logger.info(meta, "processing event");

        // A spectator watches from the lobby's room, and is sent the game without anyone's cards.
        // They don't take a place, so nobody else is told.
        const { payload } = ensureAuth(client);
        if (payload.kind === "spectator") {
            if (!(await context.lobbyService.canWatch(payload, pin))) {
                throw ApiError.http(401, "This lobby doesn't let anyone watch");
            }

            await client.join(pin);
            logger.info(meta, "spectator watching lobby");

            const lobby = await context.lobbyService.get(pin);
            if (lobby.status !== "playing") {
                await client.emit("join", { as: "spectator", lobby });
                return;
            }

            const game = await context.gameService(lobby).getSpectatorState();
            await client.emit("join", { as: "spectator", lobby, game: game.update, gameVersion: game.version });
            return;
        }

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
        await client.emit("join", {
            as: "player",
            lobby,
            ...(game && { game: game.update, gameVersion: game.version }),
        });

        await withRooms(pin).broadcast("lobbyState", {
            update: {
                type: "new_player",
            },
            lobby: await context.lobbyService.get(pin),
        });
    },
});

export default onJoin;
