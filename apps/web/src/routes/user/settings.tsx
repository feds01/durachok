import { useState } from "react";

import { LayoutDashboard } from "lucide-react";

import Alert, { AlertKind } from "@/components/Alert";
import AppHeader from "@/components/AppHeader";
import UserAvatar from "@/components/UserAvatar";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import DeleteUserForm from "@/forms/DeleteUserForm";
import UpdateUserForm from "@/forms/UpdateUserForm";
import UpdateUserProfileImageForm from "@/forms/UpdateUserProfileImageForm";
import { PANEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/user/settings")({
    beforeLoad: ({ context, location }) => {
        if (!context.auth.account) {
            throw redirect({
                to: "/login",
                search: {
                    redirect: location.href,
                },
            });
        }

        return {
            user: context.auth.account.user,
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

    const handleOutcome = (severity: AlertKind, message: string) => {
        setEvent({ severity, message });
    };

    return (
        <div className="flex w-full flex-col px-4 pb-10">
            <AppHeader>
                <Button variant="secondary" asChild>
                    <Link to="/user">
                        <LayoutDashboard />
                        Dashboard
                    </Link>
                </Button>
                <UserMenu />
            </AppHeader>
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
                <h1 className="m-0 text-3xl">Account settings</h1>
                {event && <Alert kind={event.severity} message={event.message} />}
                <section className={cn(PANEL, "flex items-center gap-5 max-sm:flex-col max-sm:items-start")}>
                    <UserAvatar image={user.image} size={88} alt="Your profile picture" />
                    <div className="flex flex-col items-start gap-3">
                        <h2 className="m-0 text-2xl">Profile picture</h2>
                        <p className="m-0 text-muted-foreground">
                            Upload a JPG of up to 1MB to use as your profile picture. A square image fits best.
                        </p>
                        <UpdateUserProfileImageForm onResponse={handleOutcome} />
                    </div>
                </section>
                <section className={cn(PANEL, "flex flex-col gap-3")}>
                    <h2 className="m-0 text-2xl">Account details</h2>
                    <p className="m-0 text-muted-foreground">
                        Change your name, email or password. A name or email that another player has is taken.
                    </p>
                    <UpdateUserForm onResponse={handleOutcome} user={user} />
                </section>
                <section className={cn(PANEL, "flex flex-col items-start gap-3 border-destructive/40")}>
                    <h2 className="m-0 text-2xl text-destructive">Danger zone</h2>
                    <p className="m-0 text-muted-foreground">
                        Deleting your account removes everything on it, including your games and statistics, for good.
                    </p>
                    <DeleteUserForm onResponse={handleOutcome} />
                </section>
            </div>
        </div>
    );
}
