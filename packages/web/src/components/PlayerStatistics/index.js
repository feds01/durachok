import React from 'react';
import PropTypes from 'prop-types';
import styles from "./index.module.scss";

const Statistic = props => {
    return (
        <div className={styles.Statistic}>
            <span>{props.value}</span>
            <p>{props.name}</p>
        </div>
    )
};

Statistic.propTypes = {
    value: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
}



const PlayerStatistics = props => {
    return (
        <div className={styles.Grid}>
            {
                props.statistics && Object.keys(props.statistics).map((entry) => {
                    const statistic = props.statistics[entry];

                    return <Statistic key={statistic.name} {...statistic}/>
                })
            }
        </div>
    );
};

PlayerStatistics.propTypes = {
    statistics: PropTypes.object.isRequired,
};

export default PlayerStatistics;
