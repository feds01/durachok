import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import styles from './index.module.scss';
import GameSecurityCard from "../SecurityCard";

function createGamePassphrase() {
    const cardSuites = ['♡', '♢', '♣', '♤'];
    let currentIndex = cardSuites.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = cardSuites[currentIndex];
        cardSuites[currentIndex] = cardSuites[randomIndex];
        cardSuites[randomIndex] = temporaryValue;
    }

    return cardSuites;
}

Passphrase.propTypes = {
    passphrase: PropTypes.arrayOf(PropTypes.string).isRequired,
    timeout: PropTypes.number.isRequired,
    ws: PropTypes.func.isRequired,
}

function Passphrase(props) {
    const [passphrase, setPassphrase] = useState(props.passphrase);
    const [timeLeft, setTimeLeft] = useState(props.timeout);

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(timeLeft - 1);
        }, 1000);

        return () => {
            clearTimeout(timer);
        }
    });

    useEffect(() => {
        if (timeLeft === 0) {
            const newPassphrase = createGamePassphrase();

            setTimeLeft(props.timeout);
            setPassphrase(newPassphrase);

            // send message on ws to update the client
            props.ws.emit("update_passphrase", {passphrase: newPassphrase.join("")});
        }

    }, [timeLeft]);

    return (
        <div className={styles.Passphrase}>
            <p>{timeLeft}</p>
            {
                passphrase.map((symbol, index) => {
                    return (
                        <GameSecurityCard
                            key={index}
                            symbol={symbol}
                            selected
                            style={{
                                borderColor: `rgba(172, 170, 190, 1)`,
                                color: `rgba(172, 170, 190, 1)`
                            }}
                        />
                    )
                })
            }
        </div>
    );
}

export default Passphrase;
