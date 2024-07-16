import PropTypes from 'prop-types';
import React, {useEffect} from 'react';
import styles from "./index.module.scss";
import {useGameState} from "../GameContext";


const Announcement = ({onFinish}) => {
    const {isDefending} = useGameState();

    useEffect(() => {
        const timeout = setTimeout(() => {
            onFinish();
        }, 2000);

        return () => {
            clearTimeout(timeout);
        }
    }, [onFinish]);

    return (
        <div className={styles.Announcement}>
            <h1>{isDefending ? "Defending!" : "Attacking!"}</h1>
        </div>
    );
};

Announcement.propTypes = {
    onFinish: PropTypes.func.isRequired,
};

export default Announcement;
