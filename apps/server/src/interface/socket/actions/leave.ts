import { GamePinSchema } from "@durachok/transport/src/schemas/lobby";
import { z } from "zod";

import { PlayerNotInLobbyError } from "../../../controllers/common";
import { assert, isDef } from "../../../utils";
import { ensureLobbyAccess } from "../common/auth";
import { factory } from "./ctx";

const onLeave = factory.build({
    event: "leave",
    input: z.tuple([GamePinSchema]),
    handler: async ({ all, input, client, logger: $ctx }) => {
        const { ctx } = $ctx;
        const logger = $ctx;
        const [[pin]] = input;
        const meta = { event: "leave", pin, clientId: client.id };

        logger.info(meta, "processing event");
        ensureLobbyAccess(ctx, client, pin);

        const status = await ctx.lobbyService.getStatus(pin);

        // Ensure that the lobby is not in "playing" state when
        // players are locked in.
        if (status !== "waiting") {
            logger.warn(meta, "unable to process event due to in-game lobby");
            client.emit("error", {
                type: "bad_request",
            });
            return;
        }

        try {
            await ctx.lobbyService.removePlayerByConnectionId(pin, client.id);
        } catch (err: unknown) {
            if (err instanceof PlayerNotInLobbyError) {
                logger.warn(meta, "failed to process event", err);
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

export default onLeave;
