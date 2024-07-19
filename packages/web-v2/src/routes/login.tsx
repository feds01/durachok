import { z } from "zod";
import { createFileRoute, redirect } from "@tanstack/react-router";
const LoginSearchSchema = z.object({
    redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
    validateSearch: (search) => LoginSearchSchema.parse(search),
    beforeLoad: async ({ context, search }) => {
        if (context.auth.kind === "logged-in") {
            throw redirect({
                to: search.redirect ?? "/user",
            });
        }
    },
    component: Login,
});

export default function Login() {
    return <div>Login</div>;
}
