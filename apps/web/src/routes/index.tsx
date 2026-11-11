import { motion } from "framer-motion";
import { LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import { flushSync } from "react-dom";

import Logo from "@/components/Logo";
import OrDivider from "@/components/OrDivider";
import { Button } from "@/components/ui/button";
import { useAuthDispatch, useAuthState } from "@/contexts/auth";
import GamePrompt, { LobbyAuthInfo } from "@/forms/GamePrompt";
import { fadeUp } from "@/lib/motion";
import { isDef } from "@/utils";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
    // A pin that a lobby link passed on, which TanStack Router may have parsed as a number.
    validateSearch: (search: Record<string, unknown>): { startPin?: string } =>
        isDef(search.startPin) ? { startPin: String(search.startPin) } : {},
    component: Index,
});

function Index() {
    const { startPin } = Route.useSearch();
    const { isRegistered } = useAuthState();
    const auth = useAuthDispatch();
    const navigator = useNavigate();

    const redirectToLobby = ({ pin, seat }: LobbyAuthInfo) => {
        // Anonymous players, and spectators, get tokens for the lobby that they joined or watch.
        // The lobby's guard reads the auth state that the router was last rendered with, so the new
        // seat is rendered at once, before the player goes in, or the guard sends them back here.
        if (isDef(seat)) {
            flushSync(() => auth({ type: "join", pin, payload: seat }));
        }

        navigator({
            to: `/lobby/$pin`,
            params: { pin: pin },
        });
    };

    return (
        <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-12">
            {/* Fades in, e.g. as the user arrives from logging out. */}
            <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex w-full max-w-md flex-col items-center gap-6 text-center"
            >
                <Logo size={72} />
                <GamePrompt startPin={startPin} onSuccess={redirectToLobby} />
                <OrDivider />
                {isRegistered() ? (
                    <Button variant="secondary" size="lg" className="w-full" asChild>
                        <Link to="/user">
                            <LayoutDashboard />
                            Go to your dashboard
                        </Link>
                    </Button>
                ) : (
                    <div className="grid w-full grid-cols-2 gap-3">
                        <Button variant="secondary" size="lg" asChild>
                            <Link to="/login">
                                <LogIn />
                                Log in
                            </Link>
                        </Button>
                        <Button variant="secondary" size="lg" asChild>
                            <Link to="/register">
                                <UserPlus />
                                Register
                            </Link>
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
