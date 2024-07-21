import { createFileRoute, redirect } from "@tanstack/react-router";
import { trpc } from "../../utils/trpc";

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
        return {
            pin,
        };
    },
    component: () => <Lobby />,
});

function Lobby() {
    const { pin } = Route.useLoaderData();
    const lobby = trpc.lobbies.get.useQuery({ pin });

    if (lobby.error) {
        return <div> {lobby.error.message} </div>;
    }

    if (lobby.isLoading) {
        return <div> Loading... </div>;
    }

    return <div> {JSON.stringify(lobby.data, null, 4)} </div>;
}
