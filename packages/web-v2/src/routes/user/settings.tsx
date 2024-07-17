import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/user/settings")({
    component: () => <div>Hello /user/settings!</div>,
});
