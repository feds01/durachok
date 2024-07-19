import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/user/")({
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
    component: UserRoute,
});

function UserRoute() {
    return (
        <div>
            <h1>User Route</h1>
        </div>
    );
}
