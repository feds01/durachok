import { useShallow } from "zustand/react/shallow";

import Alert from "@/components/Alert";
import CountdownOverlay from "@/components/CountdownOverlay";
import ErrorBoundary from "@/components/ErrorBoundary";
import Loader from "@/components/Loader";
import { useAuthDispatch, useAuthState } from "@/contexts/auth";
import { useLobbyConnection, useLobbyStore } from "@/contexts/lobby";
import LobbyClosed from "@/fragments/LobbyClosed";
import WaitingRoom from "@/fragments/WaitingRoom";
import { trpcNativeClient } from "@/utils/trpc";
import { TRPCClientError } from "@trpc/client";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/lobby/$pin")({
    // Visitors without a session join from the home page, with the pin filled in.
    beforeLoad: ({ context, params }) => {
        if (context.auth.kind === "logged-out") {
            throw redirect({ to: "/", search: { startPin: params.pin } });
        }
    },
    // So do players who aren't in the lobby, e.g. with a session for another lobby.
    loader: async ({ params: { pin } }) => {
        const isMember = await trpcNativeClient.lobbies.get.query({ pin }).then(
            () => true,
            (error: unknown) => {
                if (error instanceof TRPCClientError && ["UNAUTHORIZED", "NOT_FOUND"].includes(error.data?.code)) {
                    return false;
                }
                throw error;
            },
        );

        if (!isMember) {
            throw redirect({ to: "/", search: { startPin: pin } });
        }

        return { pin };
    },
    pendingComponent: () => <Loader />,
    errorComponent: (info) => <ErrorBoundary {...info} />,
    component: () => <LobbyPage />,
});

function LobbyPage() {
    const { pin } = Route.useLoaderData();
    useLobbyConnection(pin);

    const { connection, lobby, countingDown, error, leave } = useLobbyStore(
        useShallow((state) => ({
            connection: state.connection,
            lobby: state.lobby,
            countingDown: state.countingDown,
            error: state.error,
            leave: state.leave,
        })),
    );
    const { state: auth } = useAuthState();
    const updateAuth = useAuthDispatch();
    const navigate = useNavigate();

    if (connection.kind === "closed") {
        return <LobbyClosed pin={pin} reason={connection.reason} />;
    }

    if (!lobby) {
        return <Loader />;
    }

    const user = auth.kind === "logged-in" ? auth.user : null;
    const isOwner = user?.kind === "registered" && user.id === lobby.owner.id;

    const onLeave = async () => {
        leave();
        await navigate({ to: "/" });

        // An anonymous session only belongs to the lobby that the player just left.
        if (user?.kind === "anonymous") {
            updateAuth({ type: "logout" });
        }
    };

    return (
        <>
            {connection.kind === "reconnecting" && (
                <p className="fixed left-1/2 top-4 z-40 m-0 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 font-body">
                    Reconnecting…
                </p>
            )}
            {error && (
                <div className="fixed left-1/2 top-4 z-40 w-full max-w-md -translate-x-1/2 px-4">
                    <Alert key={error.at} kind="error" message={error.message} />
                </div>
            )}
            {lobby.status === "waiting" ? (
                <WaitingRoom
                    lobby={lobby}
                    isOwner={isOwner}
                    // Registered players go by their account's id, anonymous ones by their name.
                    isMe={(player) => (user?.kind === "registered" ? player.id === user.id : player.id === user?.name)}
                    onLeave={onLeave}
                />
            ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                    <h1 className="m-0 text-4xl">The game is on</h1>
                    <p className="m-0 font-body text-muted-foreground">The card table arrives in the next update.</p>
                </div>
            )}
            {countingDown && <CountdownOverlay />}
        </>
    );
}
