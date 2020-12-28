import clsx from "clsx";
import React from 'react';
import styles from './index.module.scss';

const GameSecurityCard = (props) => {
    return (
        <span
            {...(props.style && {style: props.style})}
            className={clsx(styles.Card, {[styles.Selected]: props.selected})}
            {...(props.onClick && {onClick: props.onClick})}
        >
            {props.symbol}
        </span>
    );
};

export default GameSecurityCard;
