import { useEffect, useMemo, useState } from "react";
import { Home } from "lucide-react";

import PlayingCard from "@/assets/image/playing-card.svg?react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuthDispatch, useAuthState } from "@/contexts/auth";
import GamePrompt, { LobbyAuthInfo } from "@/forms/GamePrompt";
import { isDef } from "@/utils";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
    component: Index,
});

const random = (max: number) => Math.floor(Math.random() * max);

const PlayingCardIcon = ({ index }: { index: number }) => {
    const animationData = useMemo(
        () => ({
            left: `calc(${random(120) - 20}% - 20px)`,
            duration: `${6 + random(15)}s`,
            delay: `${random(5) - 5}s`,
            scale: 0.3 * index - 0.6,
            rotation: random(360),
            zIndex: index - 7,
            blur: index - 6,
            keyframeName: `raise-${index}-${random(10000)}`,
        }),
        [index],
    );

    useEffect(() => {
        const styleId = `playing-card-animation-${animationData.keyframeName}`;
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
                @keyframes ${animationData.keyframeName} {
                    to {
                        bottom: 150vh;
                        transform: scale(${animationData.scale}) rotate(${animationData.rotation + 180}deg);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }, [animationData]);

    return (
        <PlayingCard
            className="w-16 h-16 max-sm:w-8 max-sm:h-8 absolute"
            style={{
                bottom: "-100vh",
                transformStyle: "preserve-3d",
                left: animationData.left,
                animation: `${animationData.keyframeName} ${animationData.duration} linear infinite`,
                animationDelay: animationData.delay,
                transform: `scale(${animationData.scale}) rotate(${animationData.rotation}deg)`,
                zIndex: animationData.zIndex,
                filter: `blur(${animationData.blur}px)`,
            }}
        />
    );
};

function Index() {
    const [pin] = useState<string | undefined>();
    const { isRegistered } = useAuthState();
    const auth = useAuthDispatch();
    const navigator = useNavigate();

    const redirectToLobby = ({ pin, tokens }: LobbyAuthInfo) => {
        if (isDef(tokens)) {
            auth({
                type: "login",
                payload: { user: { kind: "anonymous", lobby: pin }, ...tokens },
            });
        }

        navigator({
            to: `/lobby/$pin`,
            params: { pin: pin },
        });
    };

    useEffect(() => {
        document.getElementsByTagName("body")[0].style.overflow = "hidden";

        return () => {
            document.getElementsByTagName("body")[0].style.overflow = "auto";
        };
    }, []);

    return (
        <div className="perspective-origin-center">
            {isRegistered() && (
                <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-10" asChild>
                    <Link to="/user">
                        <Home className="h-6 w-6" />
                    </Link>
                </Button>
            )}
            {[...Array(12)]
                .map((_, i) => i)
                .map((k, i) => (
                    <PlayingCardIcon index={i} key={k} />
                ))}
            <div className="max-w-150 mx-auto pt-4 flex flex-col h-full rounded text-center max-sm:pt-16 max-sm:mx-8">
                <Logo size={64} />
                <GamePrompt startPin={pin} onSuccess={redirectToLobby} />
                {isRegistered() ? (
                    <p>
                        Go to your{" "}
                        <Link className="text-primary" to={"/user"}>
                            dashboard
                        </Link>
                    </p>
                ) : (
                    <p>
                        Got an account? Login{" "}
                        <Link className="text-primary" to={"/login"}>
                            here
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}
