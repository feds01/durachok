import { css } from "@emotion/css";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { z } from "zod";

import Logo from "../components/Logo";
import { useAuth } from "../contexts/auth";
import LoginForm from "../forms/Login";
import { AuthResult } from "../types/auth";

const LoginSearchSchema = z.object({
    redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
    validateSearch: (search) => LoginSearchSchema.parse(search),
    beforeLoad: async ({ context, search }) => {
        if (
            context.auth.kind === "logged-in" &&
            context.auth.user.kind === "registered"
        ) {
            throw redirect({
                to: search.redirect ?? "/user",
            });
        }
    },
    component: Login,
});

const container = css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    align-items: center;

    @media (max-width: 500px) {
        justify-content: flex-start;

        & > div {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            overflow: hidden;
        }
    }
`;

const login = css`
    background: #1a1d3d;
    box-shadow:
        0 10px 20px rgba(0, 0, 0, 0.19),
        0 6px 6px rgba(0, 0, 0, 0.23);
    padding: 5em 2em;
    border-radius: 12px;

    width: 480px;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    margin: 0 auto;

    & input {
        background: #3b3d54;
    }

    & h2 {
        font-size: 28px;
        font-family: "Cabin", sans-serif;
    }

    @media (max-width: 500px) {
        flex-grow: 1;
        width: 100% !important;
        display: block !important;
        border-radius: 0 !important;
        box-shadow: none !important;
    }
`;

export default function Login() {
    const navigate = useNavigate();
    const { redirect } = Route.useSearch();
    const [state, dispatch] = useAuth();

    const onSuccess = (result: AuthResult) => {
        const { token, refreshToken, ...user } = result;

        dispatch({
            type: "login",
            payload: {
                token,
                refreshToken,
                user: { kind: "registered", ...user },
            },
        });
    };

    // @@Hack: we should be able to rely on `router.invalidate()` which
    // should reset the context of the router, and hence re-direct use to
    // the correct page.
    useEffect(() => {
        if (state.kind === "logged-in") {
            navigate({ to: redirect ?? "/user" });
        }
    }, [state.kind, redirect, navigate]);

    return (
        <div className={container}>
            <motion.div
                transition={{ duration: 0.5 }}
                initial={{ x: "calc(-100vw)" }}
                animate={{ x: 0 }}
                exit={{ x: "100vw" }}
            >
                <div className={login}>
                    <Logo size={48} />
                    <h2>Login</h2>
                    <LoginForm onSuccess={onSuccess} />
                    <p
                        className={css`
                            color: white;
                            font-size: 15px;

                            & a {
                                color: dodgerblue;
                            }
                        `}
                    >
                        New User? Create account{" "}
                        <Link to={"/register"}>here</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
