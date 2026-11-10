import { useShallow } from "zustand/react/shallow";

import CountdownOverlay from "@/components/CountdownOverlay";
import ErrorBoundary from "@/components/ErrorBoundary";
import Loader from "@/components/Loader";
import LobbyChat from "@/components/LobbyChat";
import LobbyNotices from "@/components/LobbyNotices";
import { sessionFor, useAuthDispatch, useAuthState } from "@/contexts/auth";
import { useLobbyConnection, useLobbyStore } from "@/contexts/lobby";
import GameResults from "@/fragments/GameResults";
import GameTable from "@/fragments/GameTable";
import LobbyClosed from "@/fragments/LobbyClosed";
import WaitingRoom from "@/fragments/WaitingRoom";
import { trpcNativeClient } from "@/utils/trpc";
import { TRPCClientError } from "@trpc/client";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/lobby/$pin")({
    // Visitors without a seat in the lobby or an account join from the home page, with the pin filled in.
    beforeLoad: ({ context, params }) => {
        if (!sessionFor(context.auth, params.pin)) {
            throw redirect({ to: "/", search: { startPin: params.pin } });
        }
    },
    // So do players who aren't in the lobby, e.g. with an account that never joined it.
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
    pendingComponent: () => <Loader label="Finding the lobby" />,
    errorComponent: (info) => <ErrorBoundary {...info} />,
    component: () => <LobbyPage />,
});

function LobbyPage() {
    const { pin } = Route.useLoaderData();
    useLobbyConnection(pin);

    const { connection, lobby, game, results, countingDown, error, leave, dismissResults, sendMessage } = useLobbyStore(
        useShallow((state) => ({
            connection: state.connection,
            lobby: state.lobby,
            game: state.game,
            results: state.results,
            countingDown: state.countingDown,
            error: state.error,
            leave: state.leave,
            dismissResults: state.dismissResults,
            sendMessage: state.sendMessage,
        })),
    );
    const { state: auth } = useAuthState();
    const updateAuth = useAuthDispatch();
    const navigate = useNavigate();

    if (connection.kind === "closed") {
        return <LobbyClosed pin={pin} reason={connection.reason} />;
    }

    if (!lobby) {
        return <Loader label={`Joining lobby ${pin}`} />;
    }

    const user = sessionFor(auth, pin)?.user ?? null;
    const isOwner = user?.kind === "registered" && user.id === lobby.owner.id;

    const onLeave = async () => {
        leave();
        await navigate({ to: "/" });

        // An anonymous player's seat belongs to the lobby that they just left, and the others stay.
        if (user?.kind === "anonymous") {
            updateAuth({ type: "leave", pin });
        }
    };

    return (
        <>
            <LobbyNotices reconnecting={connection.kind === "reconnecting"} error={error} />
            {lobby.status === "waiting" ? (
                <WaitingRoom
                    lobby={lobby}
                    isOwner={isOwner}
                    // Registered players go by their account's id, anonymous ones by their name.
                    isMe={(player) => (user?.kind === "registered" ? player.id === user.id : player.id === user?.name)}
                    onLeave={onLeave}
                />
            ) : game ? (
                <GameTable lobby={lobby} game={game} />
            ) : (
                // The game starts once the countdown ends, and its first update deals the cards.
                <Loader label="Dealing the cards" />
            )}
            {!lobby.disableChat && <LobbyChat messages={lobby.chat} me={user?.name ?? null} onSend={sendMessage} />}
            {results && <GameResults results={results} me={user?.name ?? null} onClose={dismissResults} />}
            {countingDown && <CountdownOverlay />}
        </>
    );
}
