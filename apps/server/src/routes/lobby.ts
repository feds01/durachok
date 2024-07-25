import {
    ByPinRequestSchema,
    GameCreateRequestSchema,
    GameJoinRequestSchema,
    NameFreeInLobbyRequestSchema,
} from "@durachok/transport/src/request";
import { TRPCError } from "@trpc/server";

import {
    authProcedure,
    publicProcedure,
    router,
    userProcedure,
} from "../lib/trpc";
import { Player } from "../schemas/lobby";
import { expr } from "../utils";

export const lobbyRouter = router({
    getInfo: publicProcedure.input(ByPinRequestSchema).query(async (req) => {
        const { ctx, input } = req;
        return ctx.lobbyService.getInfoByPin(input.pin);
    }),

    create: userProcedure
        .input(GameCreateRequestSchema)
        .mutation(async (req) => {
            const {
                ctx,
                input: { settings },
            } = req;
            return ctx.lobbyService.create(ctx.user.id, settings);
        }),

    get: authProcedure.input(ByPinRequestSchema).query(async (req) => {
        const {
            ctx: { token },
            ctx,
            input,
        } = req;

        // Ensure player can read the lobby
        const hasAccess = await expr(async () => {
            if (token.kind === "registered") {
                return await ctx.lobbyService.isUserInLobby(
                    input.pin,
                    token.user.name,
                );
            } else {
                // @@Todo: There is a potential problem, if a lobby pin is re-used within
                // the expiration time of the token, then the user could join the new
                // lobby without the owner's permission or without going through the standard
                // join process. Mitigation is to parametrise the token over the `id` of the
                // lobby which should be unique.
                return token.pin === input.pin;
            }
        });

        if (!hasAccess) {
            return new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Check that the user is the owner of the lobby
        const lobby = await ctx.lobbyService.getByPin(input.pin);
        if (!lobby) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }

        return lobby;
    }),

    delete: userProcedure.input(ByPinRequestSchema).mutation(async (req) => {
        const { ctx, input } = req;

        // Check that the user is the owner of the lobby
        const lobby = await ctx.lobbyService.getByPin(input.pin);

        if (!lobby) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Verify that the user is the owner of the lobby
        if (lobby.owner.id !== ctx.user.id) {
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        return ctx.lobbyService.delete(input.pin);
    }),

    join: publicProcedure.input(GameJoinRequestSchema).mutation(async (req) => {
        const { ctx, input } = req;

        // We need to check that the lobby:
        //
        // - Must exist, and is in the "waiting" state.
        // - Must have free slots.
        // - Must have the correct passphrase if it is enabled.
        // - Provided name must not be taken.

        const lobby = await ctx.lobbyService.getByPin(input.pin);
        if (!lobby) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Check that the lobby is in the waiting state and has free slots.
        if (
            lobby.status !== "waiting" ||
            lobby.players.length >= lobby.maxPlayers
        ) {
            throw new TRPCError({ code: "BAD_REQUEST" });
        }

        // Check that the passphrase is correct.
        if (lobby.passphrase && lobby.passphrase !== input.passphrase) {
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const player: Player = expr(() => {
            if (ctx.token?.kind === "registered") {
                return {
                    name: input.name,
                    socket: null,
                    registered: ctx.token.user.id,
                    confirmed: false,
                };
            } else {
                return { name: input.name, socket: null, confirmed: false };
            }
        });

        // We need to determine whether the `name` is taken or not.
        const isUserInLobby = await ctx.lobbyService.isUserInLobby(
            input.pin,
            input.name,
            player.registered,
        );
        if (isUserInLobby) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "User already in lobby",
            });
        }

        await ctx.lobbyService.addUserTo(input.pin, player);

        // Okay, now we need to determine whether this is an "anonymous" user,
        // or a registered user. If it's a registered user, we can just add them
        // to the lobby, otherwise we need to generate a token for them.
        return {
            ...(!player.registered && {
                ...(await ctx.authService.createTokens({
                    pin: input.pin,
                    name: input.name,
                })),
            }),
        };
    }),
});
