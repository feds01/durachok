import { UserUpdateSchema } from "../schemas/user";
import { router, userProcedure } from "../lib/trpc";


export const userRouter = router({
    get: userProcedure.query(async (req) => {
        return req.ctx.user;
    }),

    update: userProcedure.input(UserUpdateSchema).mutation(async (req) => {
        const { ctx, input } = req;
        ctx.userService.update(ctx.user.id, input);
    }),

    delete: userProcedure.mutation(async (req) => {
        const { ctx } = req;
        ctx.userService.delete(ctx.user.id);
    }),
});
