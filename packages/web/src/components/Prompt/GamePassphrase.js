import './GamePassphrase.scss';
import Loader from "react-loader-spinner";
import React, {useEffect, useState} from 'react';
import GameSecurityCard from "../SecurityCard";

const symbols = ['♡', '♢', '♣', '♤'];
const errorMessages = {
    "INVALID_PASSPHRASE": "Incorrect Pin",
    "LOBBY_FULL": "Lobby is full",
    "BAD_INFO": "Bad request, refresh browser",
    "MISSING_INFO": "Bad request, refresh browser"
}

const GamePassphrase = React.memo(function GameSecurity({pin, onError, onSubmit}) {
    const [order, setOrder] = useState('');
    const [message, setMessage] = useState("");
    const [checking, setChecking] = useState(false);


    // Register key listener to listen for 'esc' character.
    useEffect(() => {
        function keyListener(event) {
            if (event.key === "Escape") setOrder("");
        }

        document.addEventListener("keydown", keyListener);

        return () => {
            document.removeEventListener("keydown", keyListener);
        }

    }, []);

    // This is used as a reset function when user enters an incorrect security code.
    useEffect(() => {
        let mounted = true;

        if (message !== "" && !checking && order.length === 4) {
            // some other error occurred such as 'LOBBY_FULL', re-direct
            // the user to the home page.
            setTimeout(() => {
                if (mounted) {
                    setOrder("");

                    if (message !== "INVALID_PASSPHRASE") {
                        onError();
                    }
                }
            }, 1000);
        }

        return () => mounted = false;
    }, [message, order, checking, onError]);

    useEffect(() => {
            let mounted = true;

            async function verifyLobby() {
                // Only invoke a pin check when the user has selected all four cards
                // The order that the user selected the cards is then sent to auth API
                // and a response if it's valid or not is returned.
                if (order.length === 4) {
                    setChecking(true);

                    const result = await onSubmit(order);

                    if (!result?.status && mounted) {
                        setMessage(result.err);
                    }

                    if (mounted) setChecking(false);
                }
            }

            verifyLobby();

            return () => mounted = false;
        }, [order, pin, onSubmit]
    );

    return (
        <div className={'App-Security'}>
            <p className={'label'}>Security code for: <code>{pin}</code></p>
            <div
                className={'App-Security-selector' + ((!message && !checking && order.length === 4) ? ' incorrect' : '')}>
                {
                    symbols.map((symbol, index) => (
                        <GameSecurityCard
                            key={index}
                            symbol={symbol}
                            selected={order.indexOf(symbol) !== -1}
                            onClick={() => setOrder(order + symbol)}
                        />
                    ))
                }
            </div>
            <div className="checking">
                {checking && (
                    <Loader type="ThreeDots" color="#ACAABE" height={20} width={40}/>
                )}
                {(message !== "" && !checking && order.length === 4) && (
                    <p>{errorMessages[message]}</p>
                )}
            </div>

        </div>
    );
});

export default GamePassphrase;
