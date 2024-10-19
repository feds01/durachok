import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { PlayerNotInLobbyError } from "../../../controllers/common";
import { assert, isDef } from "../../../utils";
import { ensureOwnerAccess } from "../common/auth";
import { factory } from "./ctx";

const onKick = factory.build({
    event: "kick",
    input: z.tuple([GamePinSchema, z.object({ id: z.string() })]),
    handler: async ({ all, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        logger.info("processing `kick` request", client.id);

        const [[pin], { id }] = input;
        await ensureOwnerAccess(ctx, client, pin);

        const status = await ctx.lobbyService.getStatus(pin);

        // Ensure that the lobby is not in "playing" state when
        // players are locked in.
        if (status !== "waiting") {
            logger.info("cannot kick player when game is not waiting", status);
            client.emit("error", {
                type: "bad_request",
                message: "can't kick player when playing.",
            });
            return;
        }

        try {
            await ctx.lobbyService.removePlayerByConnectionId(pin, id);
        } catch (err: unknown) {
            if (err instanceof PlayerNotInLobbyError) {
                logger.warn(
                    "failed to kick player from lobby because they don't exist",
                    err,
                );
                client.emit("error", {
                    type: "bad_request",
                    message: "invalid player.",
                });
                return;
            }

            throw err;
        }

        // We need to send messages to all of the players that are in this
        // lobby, we send to all players with sockets.
        const clients = await all.getClients();

        const lobby = await ctx.lobbyService.get(pin);
        const players = await ctx.lobbyService.getPlayers(pin);
        assert(isDef(players) && isDef(lobby));

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
                            type: "player_exit",
                        },
                        lobby,
                    });
            });
    },
});

export default onKick;
