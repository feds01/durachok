import { css, keyframes } from "@emotion/css";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import PlayingCard from "../assets/image/playing-card.svg?react";
import Logo from "../components/Logo";
import { useAuthDispatch, useAuthState } from "../contexts/auth";
import GamePrompt, { LobbyAuthInfo } from "../forms/GamePrompt";
import { isDef } from "../utils";

export const Route = createFileRoute("/")({
    component: Index,
});

const random = (max: number) => Math.floor(Math.random() * max);

const PlayingCardIcon = ({ index }: { index: number }) => {
    const raise = keyframes`
        to {
            bottom: 150vh;
            transform: scale(.3 * ${index} - .6) rotate(${random(360)} + deg);
        }
    `;

    return (
        <PlayingCard
            className={css`
                width: 64px;
                height: 64px;
                position: absolute;
                bottom: -100vh;
                transform-style: preserve-3d;

                left: calc(${random(120) - 20}% - 20px);
                animation: ${raise} ${6 + random(15)}s linear infinite;
                animation-delay: ${random(5) - 5}s;
                transform: scale(${0.3 * index - 0.6}) rotate(${random(360)}deg);
                z-index: ${index - 7};
                filter: blur(${index - 6}px);

                @media (max-width: 600px) {
                    width: 32px;
                    height: 32px;
                }
            `}
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
        // set body overflow property to hidden to prevent the animation overflow, when user
        // navigates off the page, reset this to normal.
        document.getElementsByTagName("body")[0].style.overflow = "hidden";

        //    if (location?.state?.pin) {
        //        setPin(location.state.pin);
        //        navigate('', { replace: true, state: null });
        //    }

        return () => {
            document.getElementsByTagName("body")[0].style.overflow = "auto";
        };
    }, []);

    return (
        <div
            className={css`
                perspective-origin: 50% 50%;
            `}
        >
            {[...Array(12)].map((_, i) => (
                <PlayingCardIcon index={i} key={i} />
            ))}
            <div
                className={css`
                    max-width: 600px;
                    margin: 0 auto;
                    padding-top: 1em;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    border-radius: 3px;
                    text-align: center;

                    @media (max-width: 600px) {
                        padding-top: 4em;
                        margin: 0 2em;
                    }
                `}
            >
                <Logo size={64} />
                <GamePrompt startPin={pin} onSuccess={redirectToLobby} />
                {!isRegistered() && (
                    <p>
                        Got an account? Login{" "}
                        <Link
                            className={css`
                                color: #3f51b5;
                            `}
                            to={"/login"}
                        >
                            here
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}
