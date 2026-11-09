import {
    ByPinRequestSchema,
    GameCreateRequestSchema,
    GameJoinRequestSchema,
    NameFreeInLobbyRequestSchema,
} from "@durachok/transport";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";

import { limits } from "../../lib/limits";
import {
    authProcedure,
    failureLimitedProcedure,
    limitedProcedure,
    router,
    tooManyRequests,
    userProcedure,
} from "../trpc";
import { DBPlayer } from "../../schemas/lobby";
import { expr, isDef } from "../../utils";
import { notifyLobbyClosed } from "../socket";

export const lobbyRouter = router({
    // Looking lobbies up is limited, so that a script can't go through every pin to find them.
    getInfo: limitedProcedure(limits.lookups)
        .input(ByPinRequestSchema)
        .query((req) => {
            const { ctx, input } = req;
            return ctx.lobbyService.getInfo(input.pin);
        }),

    nameFreeInLobby: limitedProcedure(limits.lookups)
        .input(NameFreeInLobbyRequestSchema)
        .query(async (req) => {
            const { ctx, input } = req;
            const token = ctx.token;
            const registered = token?.kind === "registered";

            return !(await ctx.lobbyService.isUserInLobby(
                input.pin,
                input.name,
                registered ? token.user.id : undefined,
            ));
        }),

    create: userProcedure.input(GameCreateRequestSchema).mutation(async (req) => {
        const {
            ctx,
            input: { settings },
        } = req;

        // The game is created when the owner starts it, with the players who joined.
        const { pin } = await ctx.lobbyService.create(ctx.user.id, settings);
        return { pin };
    }),

    get: authProcedure.input(ByPinRequestSchema).query(async (req) => {
        const {
            ctx: { token },
            ctx,
            input,
        } = req;

        // Ensure that the player can read the lobby, i.e. they are one of its players.
        if (!(await ctx.lobbyService.hasAccess(token, input.pin))) {
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Only the owner sees the passphrase.
        const withPassphrase = await ctx.lobbyService.hasOwnerAccess(token, input.pin);
        return ctx.lobbyService.get(input.pin, { withPassphrase });
    }),

    delete: userProcedure.input(ByPinRequestSchema).mutation(async (req) => {
        const { ctx, input } = req;

        // Check that the user is the owner of the lobby
        const lobby = await ctx.lobbyService.get(input.pin);

        if (!lobby) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Verify that the user is the owner of the lobby
        if (lobby.owner.id !== ctx.user.id) {
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        await ctx.lobbyService.delete(input.pin);
        await notifyLobbyClosed(input.pin);
    }),

    // Joins that fail are limited, so that a script can't go through the pins, names or passphrases.
    join: failureLimitedProcedure(limits.failedJoins)
        .input(GameJoinRequestSchema)
        .mutation(async (req) => {
            const { ctx, input } = req;

            // We need to check that the lobby:
            //
            // - Must exist, and is in the "waiting" state.
            // - Must have free slots.
            // - Must have the correct passphrase if it is enabled.
            // - Provided name must not be taken.

            const info = await ctx.lobbyService.getInfo(input.pin);
            if (!info) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            // Check that the lobby is in the waiting state and has free slots, counting
            // everyone who joined, whether or not they have connected yet.
            if (!info.joinable) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Lobby isn't joinable" });
            }

            // Check that the passphrase is correct. A lobby takes only so many wrong ones a minute,
            // from anywhere, so that many addresses can't guess it together.
            if (info.passphrase) {
                if (limits.wrongPassphrases.isLimited(input.pin)) {
                    throw tooManyRequests();
                }
                if (!(await ctx.lobbyService.checkPassphrase(input.pin, input.passphrase))) {
                    limits.wrongPassphrases.hit(input.pin);
                    throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect passphrase" });
                }
            }

            // Registered users play under their account's name, bots under their name in the
            // registry, and anonymous players under the one they chose, in a place that only their
            // tokens can take, @see DBPlayer.seat.
            const player: DBPlayer = expr(() => {
                if (ctx.token?.kind === "registered") {
                    return {
                        name: ctx.token.user.name,
                        socket: null,
                        registered: ctx.token.user.id,
                        confirmed: false,
                    };
                }
                if (ctx.token?.kind === "bot") {
                    return { name: ctx.token.bot.name, socket: null, bot: ctx.token.bot.id, confirmed: false };
                }
                if (!isDef(input.name)) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "A player without an account needs a name" });
                }
                return { name: input.name, socket: null, confirmed: false, seat: randomUUID() };
            });

            // Add the player, if the lobby still has a place for them, and their name isn't taken.
            await ctx.lobbyService.addUserTo(input.pin, player);

            // Registered users and bots play with the tokens that they joined with, and an
            // anonymous player is given tokens for their place in this lobby.
            return {
                ...(isDef(player.seat) &&
                    ctx.authService.createTokens({ pin: input.pin, name: player.name, seat: player.seat })),
            };
        }),
});
