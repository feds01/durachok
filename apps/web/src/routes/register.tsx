import { motion } from "framer-motion";
import { DoorOpen } from "lucide-react";
import { useEffect, useMemo } from "react";
import { z } from "zod";

import OrDivider from "@/components/OrDivider";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { fadeUp } from "@/lib/motion";
import { PANEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";
import RegisterForm from "@/forms/Register";
import { AuthResult } from "@/validators/auth";
import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";

const AuthSearchSchema = z.object({
    redirect: z.string().optional(),
});

export const Route = createFileRoute("/register")({
    validateSearch: (search) => AuthSearchSchema.parse(search),
    component: Register,
});

export default function Register() {
    const navigate = useNavigate();
    const { redirect } = Route.useSearch();
    const [state, dispatch] = useAuth();

    const onSuccess = useMemo(
        () => (result: AuthResult) => {
            const { token, refreshToken, ...user } = result;

            dispatch({
                type: "login",
                payload: {
                    token,
                    refreshToken,
                    user: { kind: "registered", ...user },
                },
            });
        },
        [dispatch],
    );

    const hasAccount = state.account !== null;
    useEffect(() => {
        if (hasAccount) {
            navigate({ to: redirect ?? "/user" });
        }
    }, [hasAccount, redirect, navigate]);

    return (
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
            <motion.div
                className="flex w-full max-w-md flex-col items-center gap-6 text-center"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
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
                    <h2 className="m-0 text-center text-2xl">Create an account</h2>
                    <RegisterForm onSuccess={onSuccess} />
                </div>
                <p className="m-0 text-lg text-muted-foreground">
                    Already have an account?{" "}
                    <Link className="text-primary" to="/login">
                        Log in
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
