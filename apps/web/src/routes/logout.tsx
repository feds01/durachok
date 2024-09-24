import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/logout")({
    beforeLoad: async ({ context }) => {
        if (
            context.auth.kind === "logged-in" &&
            context.auth.user.kind === "registered"
        ) {
            context.logout();

            throw redirect({
                to: "/",
            });
        }
    },
    component: () => <div>Hello /logout!</div>,
});
