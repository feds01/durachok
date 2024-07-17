import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/user/")({
    component: () => <div>Hello /user/!</div>,
});
