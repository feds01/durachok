import { createFileRoute, redirect } from "@tanstack/react-router";

import ErrorBoundary from "../../compositions/ErrorBoundary";
import Loader from "../../compositions/Loader";
import { trpcNativeClient } from "../../utils/trpc";

export const Route = createFileRoute("/lobby/$pin")({
    beforeLoad: async ({ context, location }) => {
        if (context.auth.kind === "logged-out") {
            throw redirect({
                to: "/login",
                search: {
                    redirect: location.href,
                },
            });
        }
    },
    // We need to make a call to `lobbies.get(id)` and fetch the lobby, if we
    // fail (i.e.) unauthorized access, then we should re-direct them to home
    // page where they can re-enter their details.
    loader: async ({ params: { pin } }) => {
        // Try and load the information about the lobby.
        const lobby = await trpcNativeClient.lobbies.get.query({ pin });

        // This user doesn't have access to this lobby.
        if (lobby instanceof Error) {
            throw redirect({
                to: "/",
                search: {
                    startPin: pin,
                },
            });
        }

        return {
            pin,
            lobby,
        };
    },
    pendingComponent: () => <Loader />,
    errorComponent: (info) => <ErrorBoundary {...info} />,
    component: () => <Lobby />,
});

function Lobby() {
    const { lobby } = Route.useLoaderData();

    return <div> {JSON.stringify(lobby, null, 4)} </div>;
}
