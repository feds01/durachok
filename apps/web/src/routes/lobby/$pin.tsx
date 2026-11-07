import ErrorBoundary from "@/components/ErrorBoundary";
import Loader from "@/components/Loader";
import { trpcNativeClient } from "@/utils/trpc";
import { TRPCClientError } from "@trpc/client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/lobby/$pin")({
    // Visitors without a session join from the home page, with the pin filled in.
    beforeLoad: ({ context, params }) => {
        if (context.auth.kind === "logged-out") {
            throw redirect({ to: "/", search: { startPin: params.pin } });
        }
    },
    // So do players who aren't in the lobby, e.g. with a session for another lobby.
    loader: async ({ params: { pin } }) => {
        const lobby = await trpcNativeClient.lobbies.get.query({ pin }).catch((error: unknown) => {
            if (error instanceof TRPCClientError && ["UNAUTHORIZED", "NOT_FOUND"].includes(error.data?.code)) {
                return null;
            }
            throw error;
        });

        if (!lobby) {
            throw redirect({ to: "/", search: { startPin: pin } });
        }

        return { pin, lobby };
    },
    pendingComponent: () => <Loader />,
    errorComponent: (info) => <ErrorBoundary {...info} />,
    component: () => <Lobby />,
});

function Lobby() {
    const { lobby } = Route.useLoaderData();

    return <div> {JSON.stringify(lobby, null, 4)} </div>;
}
