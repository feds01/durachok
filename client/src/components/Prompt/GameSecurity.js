import React, {useEffect, useState} from 'react';
import './GameSecurity.scss';
import Loader from "react-loader-spinner";
import {useHistory} from "react-router";

const GameSecurityCard = (props) => {
    return (
        <button
            onClick={props.onClick}
            disabled={props.selected}
            className={'card' + (props.selected ? ' selected' : '')}
        >
            {props.symbol}
        </button>
    )
}


const GameSecurity = React.memo(function GameSecurity({pin}) {
    const history = useHistory();
    const [order, setOrder] = useState('');
    const [valid, setValid] = useState(false);
    const [checking, setChecking] = useState(false);

    const symbols = ['♡', '♢', '♣', '♤'];

    // This is used as a reset function when user enters an incorrect security code.
    useEffect(() => {
        let mounted = true;

        if (!valid && !checking && order.length === 4) {
            setTimeout(() => {
                if (mounted) setOrder('');
            }, 2000);
        }

        return () => mounted = false;
    }, [valid, order, checking])

    useEffect(() => {
        let mounted = true;

        // Only invoke a pin check when the user has selected all four cards
        // The order that the user selected the cards is then sent to auth API
        // and a response if it's valid or not is returned.
        if (order.length === 4) {
            setChecking(true);

            const payload = {passphrase: order};

            fetch(`/api/lobby/${pin}/join`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).then((res) => res.json()).then((res) => {
                if (res.status) {
                    history.push(`/lobby/${pin}`);
                } else {
                    setValid(false);
                }

                if (mounted) setChecking(false);
            });
        }

        return () => mounted = false;
    }, [order, history, pin]);

    return (
        <div className={'App-Security'}>
            <p className={'label'}>Security code for: <code>{pin}</code></p>
            <div
                className={'App-Security-selector' + ((!valid && !checking && order.length === 4) ? ' incorrect' : '')}>
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
                {(!valid && !checking && order.length === 4) && (
                    <p>Incorrect Pin</p>
                )}
            </div>

        </div>
    );
});

export default GameSecurity;
