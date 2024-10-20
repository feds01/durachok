import { useState } from "react";

import Divider from "@/components/Divider";
import PlayerAvatar from "@/components/PlayerAvatar";
import { useAuthDispatch } from "@/contexts/auth";
import CreateGameDialog from "@/fragments/CreateGameDialog";
import GameLinkCard from "@/fragments/GameLinkCard";
import trpc from "@/utils/trpc";
import { css } from "@emotion/css";
import Button from "@mui/material/Button";
import {
    Link,
    createFileRoute,
    redirect,
    useNavigate,
} from "@tanstack/react-router";

export const Route = createFileRoute("/user/")({
    beforeLoad: async ({ context, location }) => {
        if (
            context.auth.kind === "logged-out" ||
            context.auth.user.kind === "anonymous"
        ) {
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

const dashboard = css`
    text-align: center;
    padding: 0 2em;

    h1 {
        font-size: 48px;
        font-style: italic;
        font-family: "Playfair Display", serif;

        @media (max-width: 600px) {
            font-size: 30px;
        }
    }
`;

const dashboardActions = css`
    flex: 0;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin: 0.5em 0;
`;

const dashboardContent = css`
    padding-top: 1em;
    margin: 0 auto;

    display: flex;
    flex-direction: column;
    max-width: 900px;
`;

const games = css`
    text-align: left;
    display: flex;
    justify-content: flex-start;
    flex-direction: column;

    h2 {
        margin: 0;
        font-size: 24px;
    }
`;

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

    // @@Todo: add a `queryWrapper` component which can display
    // a loading spinner, error message, etc. based on the query state
    if (userQuery.isLoading || !userQuery.data) {
        return <div>Loading...</div>;
    }

    if (userQuery.error) {
        return <div>Error: {userQuery.error.message}</div>;
    }

    const { data } = userQuery;

    return (
        <div className={dashboard}>
            <div className={dashboardActions}>
                <div>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={toggleCreateGameDialog}
                    >
                        Create game
                    </Button>
                </div>
                <div>
                    <Link to={"/user/settings"}>
                        <Button
                            variant="contained"
                            color="secondary"
                            sx={{
                                textDecoration: "none",
                                mr: "1em",
                            }}
                        >
                            Settings
                        </Button>
                    </Link>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={logout}
                    >
                        Logout
                    </Button>
                </div>
            </div>
            <PlayerAvatar
                avatarUri={data.image}
                avatarSize={128}
                name={data.name}
            />
            <div className={dashboardContent}>
                {data.statistics && (
                    <>
                        <Divider />
                        <div></div>
                    </>
                )}
                <Divider />
                <div className={games}>
                    {data.games.map((game, index) => {
                        return <GameLinkCard key={index} {...game} />;
                    })}
                    {data.games.length === 0 && <p>No active games.</p>}
                </div>
            </div>
            <CreateGameDialog
                open={createGameDialogOpen}
                onClose={toggleCreateGameDialog}
            />
        </div>
    );
}
