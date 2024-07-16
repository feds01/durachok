import clsx from "clsx";
import Card from "../Card";
import React from 'react';
import PropTypes from 'prop-types';
import styles from './index.module.scss';
import {useGameState} from "../GameContext";

const Deck = props => {
    const {deckSize, trumpCard} = useGameState();

    // Don't return anything if the game state hasn't been fetched yet
    if (!trumpCard) return null;

    return (
        <div className={clsx(styles.Container, props.className)}>
            <b>{deckSize}</b>
            <Card
                draggable={false}
                className={clsx({
                    [styles.TrumpCard]: deckSize > 1,
                    [styles.TopCard]: deckSize <= 1,
                })}
                value={trumpCard.card}
                src={process.env.PUBLIC_URL + `/cards/${trumpCard.card}.svg`}
                useBackground
            />

            {deckSize > 1 && (
                <Card
                    draggable={false}
                    className={styles.TopCard}
                    src={process.env.PUBLIC_URL + `/cards/back.svg`}
                />
            )}
        </div>
    );
};

Deck.propTypes = {
    className: PropTypes.string,
};

export default Deck;
