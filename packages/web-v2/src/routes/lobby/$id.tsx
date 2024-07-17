import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lobby/$id")({
    loader: async ({ params: { id } }) => {
        return {
            id,
        };
    },
    component: () => <Lobby />,
});

function Lobby() {
    const info = Route.useLoaderData();

    return <div> {info.id} </div>;
}
