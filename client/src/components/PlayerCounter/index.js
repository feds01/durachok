import React from 'react';
import PropTypes from 'prop-types';
import styles from './index.module.scss';
import PersonIcon from '@material-ui/icons/Person';

PlayerCounter.propTypes = {
    count: PropTypes.number.isRequired,
};

function PlayerCounter(props) {
    return (
        <div className={styles.Counter}>
            <PersonIcon fontSize={"large"}/>
            <p>{props.count}</p>
        </div>
    );
}

export default PlayerCounter;
