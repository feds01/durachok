import { useState } from "react";

import Divider from "@/components/Divider";
import PlayerAvatar from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { useAuthDispatch } from "@/contexts/auth";
import CreateGameDialog from "@/fragments/CreateGameDialog";
import GameLinkCard from "@/fragments/GameLinkCard";
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

    const logout = () => {
        auth({ type: "logout" });
        navigator({ to: "/" });
    };

    const toggleCreateGameDialog = () => {
        setCreateGameDialogOpen(!createGameDialogOpen);
    };

    if (userQuery.isLoading || !userQuery.data) {
        return <div>Loading...</div>;
    }

    if (userQuery.error) {
        return <div>Error: {userQuery.error.message}</div>;
    }

    const { data } = userQuery;

    return (
        <div className="text-center px-8">
            <div className="flex-0 flex flex-row justify-between my-4">
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
                    <Button variant="secondary" onClick={logout}>
                        Logout
                    </Button>
                </div>
            </div>
            <PlayerAvatar avatarUri={data.image} avatarSize={128} name={data.name} />
            <div className="pt-4 mx-auto flex flex-col max-w-225">
                {data.statistics && (
                    <>
                        <Divider />
                        <div></div>
                    </>
                )}
                <Divider />
                <div className="text-left flex justify-start flex-col">
                    {data.games.map((game) => {
                        return <GameLinkCard key={game.pin} {...game} />;
                    })}
                    {data.games.length === 0 && <p>No active games.</p>}
                </div>
            </div>
            <CreateGameDialog open={createGameDialogOpen} onClose={toggleCreateGameDialog} />
        </div>
    );
}
