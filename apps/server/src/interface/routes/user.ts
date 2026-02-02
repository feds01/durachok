import { UserUpdateSchema } from "@durachok/transport";

import { router, userProcedure } from "../../lib/trpc";

export const userRouter = router({
    get: userProcedure.query((req) => {
        return req.ctx.user;
    }),

    update: userProcedure.input(UserUpdateSchema).mutation((req) => {
        const { ctx, input } = req;
        ctx.userService.update(ctx.user.id, input);
    }),

    delete: userProcedure.mutation((req) => {
        const { ctx } = req;
        ctx.userService.delete(ctx.user.id);
    }),
});
