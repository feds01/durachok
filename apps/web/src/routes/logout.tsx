import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/logout")({
    beforeLoad: ({ context }) => {
        if (context.auth.account) {
            context.logout();

            throw redirect({
                to: "/",
            });
        }
    },
    component: () => <div>Hello /logout!</div>,
});
