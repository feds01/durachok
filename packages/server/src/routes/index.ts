import { router } from "../lib/trpc";
import { authRouter } from "./auth";
import { lobbyRouter } from "./lobby";
import { userRouter } from "./user";

/** Define the root router, and export all sub-routers through it */
export const appRouter = router({
  auth: authRouter,
  users: userRouter,
  lobbies: lobbyRouter
});


export type AppRouter = typeof appRouter;
