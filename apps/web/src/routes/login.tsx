import { motion } from "framer-motion";
import { DoorOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import OrDivider from "@/components/OrDivider";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/auth";
import LoginForm from "@/forms/Login";
import { pageExit, settle } from "@/lib/motion";
import { PANEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { AuthResult } from "@/types/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";

const LoginSearchSchema = z.object({
    redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
    validateSearch: (search) => LoginSearchSchema.parse(search),
    beforeLoad: ({ context, search }) => {
        if (context.auth.kind === "logged-in" && context.auth.user.kind === "registered") {
            throw redirect({
                to: search.redirect ?? "/user",
            });
        }
    },
    component: Login,
});

export default function Login() {
    const navigate = useNavigate();
    const { redirect } = Route.useSearch();
    const [state, dispatch] = useAuth();
    const [loggedIn, setLoggedIn] = useState<AuthResult | null>(null);

    // The card fades away first, and the user is logged in once it has.
    const onAnimationComplete = () => {
        if (!loggedIn) {
            return;
        }

        const { token, refreshToken, ...user } = loggedIn;
        dispatch({
            type: "login",
            payload: {
                token,
                refreshToken,
                user: { kind: "registered", ...user },
            },
        });
    };

    useEffect(() => {
        if (state.kind === "logged-in") {
            navigate({ to: redirect ?? "/user" });
        }
    }, [state.kind, redirect, navigate]);

    return (
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
            <motion.div
                className={cn(
                    "flex w-full max-w-md flex-col items-center gap-6 text-center",
                    loggedIn && "pointer-events-none",
                )}
                initial={{ opacity: 0, y: 24 }}
                animate={loggedIn ? pageExit : { opacity: 1, y: 0, transition: settle }}
                onAnimationComplete={onAnimationComplete}
            >
                <Link to="/" aria-label="Home">
                    <Logo size={64} />
                </Link>
                <Button variant="secondary" size="lg" className="w-full" asChild>
                    <Link to="/">
                        <DoorOpen />
                        Join a lobby
                    </Link>
                </Button>
                <OrDivider />
                <div className={cn(PANEL, "flex w-full flex-col gap-5 text-left [&_input]:h-12 [&_input]:text-base")}>
                    <h2 className="m-0 text-center text-2xl">Log in</h2>
                    <LoginForm onSuccess={setLoggedIn} />
                </div>
                <p className="m-0 text-lg text-muted-foreground">
                    New here?{" "}
                    <Link className="text-primary" to="/register">
                        Create an account
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
