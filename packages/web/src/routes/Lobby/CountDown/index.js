import styles from './index.module.scss';
import React, {useEffect, useState} from 'react';

const CountDown = () => {
    const [timeLeft, setTimeLeft] = useState(5);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (timeLeft > 0) {
                setTimeLeft(timeLeft - 1);
            }
        }, 1000);

        return () => {
            clearTimeout(timer);
        }
    });

    return (
        <div className={styles.Countdown}>
            <p className={styles.Number}>{timeLeft}</p>
            <svg width="200" height="200">
                <circle cx="100" cy="100" r="90"/>
            </svg>
        </div>
    );
};

export default CountDown;
