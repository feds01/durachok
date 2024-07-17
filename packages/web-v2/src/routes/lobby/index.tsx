import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lobby/")({
    component: () => <div>Hello /lobby/!</div>,
});
