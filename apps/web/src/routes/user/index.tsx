import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import Divider from "@/components/Divider";
import Loader from "@/components/Loader";
import PlayerAvatar from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { useAuthDispatch } from "@/contexts/auth";
import CreateGameDialog from "@/fragments/CreateGameDialog";
import GameLinkCard from "@/fragments/GameLinkCard";
import { fadeUp, pageExit, popIn, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import trpc from "@/utils/trpc";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Home } from "lucide-react";

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
            className={cn("text-center px-8", loggingOut && "pointer-events-none")}
            variants={stagger(0.08)}
            initial="hidden"
            animate={loggingOut ? pageExit : "visible"}
            onAnimationComplete={() => loggingOut && logout()}
        >
            <motion.div variants={fadeUp} className="flex-0 flex flex-row justify-between my-4">
                <div className="flex gap-2">
                    <Button variant="secondary" size="icon" asChild>
                        <Link to="/user">
                            <Home className="h-6 w-6" />
                        </Link>
                    </Button>
                    <Button variant="secondary" onClick={toggleCreateGameDialog}>
                        Create game
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" asChild>
                        <Link to={"/user/settings"}>Settings</Link>
                    </Button>
                    <Button variant="secondary" onClick={() => setLoggingOut(true)}>
                        Logout
                    </Button>
                </div>
            </motion.div>
            <motion.div variants={fadeUp}>
                <PlayerAvatar avatarUri={data.image} avatarSize={128} name={data.name} />
            </motion.div>
            <motion.div variants={fadeUp} className="pt-4 mx-auto flex flex-col max-w-225">
                {data.statistics && (
                    <>
                        <Divider />
                        <div></div>
                    </>
                )}
                <Divider />
                <motion.div variants={stagger(0.06)} className="text-left flex justify-start flex-col">
                    <AnimatePresence>
                        {data.games.map((game) => (
                            <motion.div key={game.pin} layout variants={popIn} exit="exit">
                                <GameLinkCard {...game} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {data.games.length === 0 && <p>No active games.</p>}
                </motion.div>
            </motion.div>
            <CreateGameDialog open={createGameDialogOpen} onClose={toggleCreateGameDialog} />
        </motion.div>
    );
}
