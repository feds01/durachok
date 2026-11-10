import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import AppHeader from "@/components/AppHeader";
import Loader from "@/components/Loader";
import UserMenu from "@/components/UserMenu";
import UserStatistics from "@/components/UserStatistics";
import { useAuthDispatch } from "@/contexts/auth";
import CreateGameDialog from "@/fragments/CreateGameDialog";
import GameLinkCard from "@/fragments/GameLinkCard";
import { fadeUp, pageExit, popIn, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import trpc from "@/utils/trpc";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/user/")({
    beforeLoad: ({ context, location }) => {
        if (context.auth.kind === "logged-out" || context.auth.user.kind === "anonymous") {
            throw redirect({
                to: "/login",
                search: {
                    redirect: location.href,
                },
            });
        }
    },
    component: UserRoute,
});

function UserRoute() {
    const auth = useAuthDispatch();
    const navigator = useNavigate();
    const userQuery = trpc.users.get.useQuery();
    const [createGameDialogOpen, setCreateGameDialogOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // The dashboard fades away first, and the user is logged out once it has.
    const logout = () => {
        auth({ type: "logout" });
        navigator({ to: "/" });
    };

    const toggleCreateGameDialog = () => {
        setCreateGameDialogOpen(!createGameDialogOpen);
    };

    // A failed query has no data either, so check for the error first.
    if (userQuery.error) {
        return <div>Error: {userQuery.error.message}</div>;
    }

    if (!userQuery.data) {
        return <Loader label="Loading your dashboard" />;
    }

    const { data } = userQuery;

    return (
        <motion.div
            className={cn("flex flex-col px-4 pb-10 text-center", loggingOut && "pointer-events-none")}
            variants={stagger(0.08)}
            initial="hidden"
            animate={loggingOut ? pageExit : "visible"}
            onAnimationComplete={() => loggingOut && logout()}
        >
            <motion.div variants={fadeUp}>
                <AppHeader>
                    <UserMenu onLogout={() => setLoggingOut(true)} />
                </AppHeader>
            </motion.div>
            <motion.section variants={fadeUp} className="mx-auto mt-6 w-full max-w-5xl text-left">
                <h1 className="mb-4 mt-0 text-3xl">Your games</h1>
                <motion.div variants={stagger(0.06)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                        {data.games.map((game) => (
                            <motion.div key={game.pin} layout variants={popIn} exit="exit">
                                <GameLinkCard {...game} />
                            </motion.div>
                        ))}
                        {/* A slot for another game, as the lobby shows its open seats. */}
                        <motion.button
                            key="new-game"
                            type="button"
                            layout
                            variants={popIn}
                            whileHover={{ y: -4 }}
                            onClick={toggleCreateGameDialog}
                            className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                        >
                            <Plus className="size-6" aria-hidden="true" />
                            New game
                        </motion.button>
                    </AnimatePresence>
                </motion.div>
            </motion.section>
            <motion.section variants={fadeUp} className="mx-auto mt-10 w-full max-w-5xl text-left">
                <h2 className="mb-4 mt-0 text-2xl">Your record</h2>
                <UserStatistics statistics={data.statistics} />
            </motion.section>
            <CreateGameDialog open={createGameDialogOpen} onClose={toggleCreateGameDialog} />
        </motion.div>
    );
}
