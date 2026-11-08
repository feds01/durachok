import { UserUpdateSchema } from "@durachok/transport";

import { limits } from "../../lib/limits";
import { router, tooManyRequests, userProcedure } from "../../lib/trpc";
import { isDef } from "../../utils";

export const userRouter = router({
    get: userProcedure.query((req) => {
        return req.ctx.user;
    }),

    update: userProcedure.input(UserUpdateSchema).mutation(async (req) => {
        const { ctx, input } = req;

        // A user changes their avatar only so often, so that nobody floods the server with uploads.
        if (isDef(input.image) && !limits.avatars.take(ctx.user.id)) {
            throw tooManyRequests();
        }
        await ctx.userService.update(ctx.user.id, input);
    }),

    delete: userProcedure.mutation(async (req) => {
        const { ctx } = req;
        await ctx.userService.delete(ctx.user.id);
    }),
});
