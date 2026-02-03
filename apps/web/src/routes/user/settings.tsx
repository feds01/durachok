import { useState } from "react";

import Alert, { AlertKind } from "@/components/Alert";
import Divider from "@/components/Divider";
import PlayerAvatar from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { useAuthDispatch } from "@/contexts/auth";
import DeleteUserForm from "@/forms/DeleteUserForm";
import UpdateUserForm from "@/forms/UpdateUserForm";
import UpdateUserProfileImageForm from "@/forms/UpdateUserProfileImageForm";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/user/settings")({
    beforeLoad: ({ context, location }) => {
        if (context.auth.kind === "logged-out" || context.auth.user.kind === "anonymous") {
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
        <div className="text-center px-8 [&_h1]:text-5xl [&_h1]:italic [&_h1]:font-display max-sm:[&_h1]:text-3xl">
            <div className="flex-0 flex flex-row justify-between my-2">
                <Button variant="secondary" asChild>
                    <Link to={"/user"}>Home</Link>
                </Button>
                <Button variant="secondary" onClick={logout}>
                    Logout
                </Button>
            </div>
            <PlayerAvatar avatarUri={user.image} avatarSize={128} name={user.name} />
            <Divider />
            <div className="mx-auto max-w-175 flex flex-col [&_section]:mb-8 [&_h2]:text-2xl [&_h2]:text-left [&_h2]:mt-4 [&_h2]:mb-1 [&_p]:my-1">
                {event && <Alert kind={event.severity} message={event.message} className="pt-2" />}
                <section className="flex-1 items-start text-left flex flex-col w-inherit">
                    <h2>Profile Picture</h2>
                    <Divider />
                    <p>
                        You can upload a JPG file that will be used a as a profile picture. The maximum file size is
                        1MB. To get the best profile image fit, try to use an image that has square dimensions.
                    </p>
                    <UpdateUserProfileImageForm onResponse={handleOutcome} />
                </section>
                <section className="flex-1 items-start text-left flex flex-col w-inherit">
                    <h2>Update User Details</h2>
                    <Divider />
                    <p>
                        Update your user account details by replacing the current information in the fields. You will
                        not be able to update your name or email to one that is already taken by another user.
                    </p>
                    <UpdateUserForm onResponse={handleOutcome} user={user} />
                </section>
                <section className="flex-1 items-start text-left flex flex-col w-inherit">
                    <h2 className="text-destructive!">Danger Zone</h2>
                    <Divider />
                    <p className="mb-2">
                        Deleting your account will remove any and all information on your account. This includes any
                        games that you have played, are playing, and all of your statistics. Once your account is
                        deleted, this information will be unrecoverable.
                    </p>
                    <DeleteUserForm onResponse={handleOutcome} />
                </section>
            </div>
        </div>
    );
}
