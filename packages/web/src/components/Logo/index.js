import React from 'react';
import PropTypes from 'prop-types';
import styles from './index.module.scss';
import PlayingCardsIcon from "../../assets/image/playing-cards.svg";

Logo.propTypes = {
    size: PropTypes.number.isRequired,
}

Logo.defaultProps = {
    size: 30
}

function Logo(props) {
    return (
        <div className={styles.Logo}>
            <h2 style={{fontSize: props.size}}>
                <img src={PlayingCardsIcon} width={props.size * 0.75} height={props.size * 0.75} alt={''}/>
                Durachok
            </h2>
        </div>
    );
};

export default Logo;
