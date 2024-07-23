import { css } from "@emotion/css";
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import {
    Link,
    createFileRoute,
    redirect,
    useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";

import Alert, { AlertKind } from "../../components/Alert";
import Divider from "../../components/Divider";
import PlayerAvatar from "../../components/PlayerAvatar";
import { useAuthDispatch } from "../../contexts/auth";
import DeleteUserForm from "../../forms/DeleteUserForm";
import UpdateUserForm from "../../forms/UpdateUserForm";
import UpdateUserProfileImageForm from "../../forms/UpdateUserProfileImageForm";

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

const settings = css`
    margin: 0 auto;
    max-width: 700px;
    display: flex;
    flex-direction: column;

    & section {
        margin-bottom: 2em;
    }

    & h2 {
        font-size: 24px;
        text-align: left;
        margin: 1em 0 0.3em 0;
    }

    & p {
        margin: 0.3em 0 0.3em;
    }
`;

const details = css`
    flex: 1;
    align-items: flex-start;
    text-align: left;
    display: flex;
    flex-direction: column;
    width: inherit;
`;

export const Route = createFileRoute("/user/settings")({
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

        return {
            user: context.auth.user,
        };
    },
    component: UserSettingsRoute,
});

type SettingsEvent = {
    severity: AlertKind;
    message: string;
};

function UserSettingsRoute() {
    const [event, setEvent] = useState<SettingsEvent | null>(null);
    const { user } = Route.useRouteContext();
    const auth = useAuthDispatch();
    const navigator = useNavigate();

    const logout = () => {
        auth({ type: "logout" });
        navigator({ to: "/" });
    };

    const handleOutcome = (severity: AlertKind, message: string) => {
        setEvent({ severity, message });
    };

    return (
        <div className={dashboard}>
            <div className={dashboardActions}>
                <Link to={"/user"}>
                    <Button
                        variant="contained"
                        color="secondary"
                        sx={{
                            textDecoration: "none",
                            mr: "1em",
                        }}
                    >
                        Home
                    </Button>
                </Link>
                <Button variant="contained" color="secondary" onClick={logout}>
                    Logout
                </Button>
            </div>
            <PlayerAvatar
                avatarUri={user.image}
                avatarSize={128}
                name={user.name}
            />
            <Divider />
            <div className={settings}>
                {event && (
                    <Alert
                        kind={event.severity}
                        message={event.message}
                        sx={{
                            pt: 1,
                        }}
                    />
                )}
                <section className={details}>
                    <h2>Profile Picture</h2>
                    <Divider />
                    <p>
                        You can upload a JPG file that will be used a as a
                        profile picture. The maximum file size is 1MB. To get
                        the best profile image fit, try to use an image that has
                        square dimensions.
                    </p>
                    <UpdateUserProfileImageForm onResponse={handleOutcome} />
                </section>
                <section className={details}>
                    <h2>Update User Details</h2>
                    <Divider />
                    <p>
                        Update your user account details by replacing the
                        current information in the fields. You will not be able
                        to update your name or email to one that is already
                        taken by another user.
                    </p>
                    <UpdateUserForm onResponse={handleOutcome} user={user} />
                </section>
                <section className={details}>
                    <h2 style={{ color: "red" }}>Danger Zone</h2>
                    <Divider />
                    <Typography component={"p"} sx={{ mb: "0.6em" }}>
                        Deleting your account will remove any and all
                        information on your account. This includes any games
                        that you have played, are playing, and all of your
                        statistics. Once your account is deleted, this
                        information will be unrecoverable.
                    </Typography>
                    <DeleteUserForm onResponse={handleOutcome} />
                </section>
            </div>
        </div>
    );
}
