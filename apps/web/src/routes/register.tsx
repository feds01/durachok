import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { z } from "zod";

import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/auth";
import RegisterForm from "@/forms/Register";
import { AuthResult } from "@/types/auth";
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

    useEffect(() => {
        if (state.kind === "logged-in") {
            navigate({ to: redirect ?? "/user" });
        }
    }, [state.kind, redirect, navigate]);

    return (
        <div className="flex flex-col justify-center h-full items-center max-sm:justify-start max-sm:[&>div]:flex max-sm:[&>div]:flex-col max-sm:[&>div]:grow max-sm:[&>div]:overflow-hidden">
            <motion.div
                transition={{ duration: 0.5 }}
                initial={{ x: "calc(100vw)" }}
                animate={{ x: 0 }}
                exit={{ x: "-100vw" }}
            >
                <div className="bg-card shadow-lg p-8 pt-20 pb-20 rounded-xl w-120 flex flex-col flex-wrap mx-auto [&_input]:bg-background [&_h2]:text-2xl [&_h2]:font-body max-sm:grow max-sm:w-full! max-sm:block! max-sm:rounded-none! max-sm:shadow-none!">
                    <Logo size={48} />
                    <h2>Register</h2>
                    <RegisterForm onSuccess={onSuccess} />
                    <p className="text-white text-sm [&_a]:text-blue-400">
                        Already registered? Login <Link to={"/login"}>here</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
