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


const GameSecurity = (props) => {
    const history = useHistory();
    const [order, setOrder] = useState('');
    const [valid, setValid] = useState(false);
    const [checking, setChecking] = useState(false);

    const symbols = ['♡', '♢', '♣', '♤'];

    // This is used as a reset function when user enters an incorrect security code.
    useEffect(() => {
        if (!valid && !checking && order.length === 4) {
            setTimeout(() => {
                setOrder('');
            }, 2000);
        }
    }, [valid, order, checking])

    useEffect(() => {
        // Only invoke a pin check when the user has selected all four cards
        // The order that the user selected the cards is then sent to auth API
        // and a response if it's valid or not is returned.
        if (order.length === 4) {
            setChecking(true);
            setTimeout(() => {
                // TODO: this is temporary and only for demo (replace with API auth call).
                if (order === '♡♢♣♤') {
                    history.push(`/lobby/${props.pin}`)
                }
                else setValid(false);

                setChecking(false);
            }, 500);
        }
    }, [order])

    return (
        <div className={'App-Security'}>
            <p className={'label'}>Security code for: <code>{props.pin}</code></p>
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
};

export default GameSecurity;
