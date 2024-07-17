import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
    component: Login,
});

export default function Login() {
    return <div>Login</div>;
}
