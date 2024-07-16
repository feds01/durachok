import React from 'react';
import PropTypes from "prop-types";
import styles from "./index.module.scss";
import Avatar from "@material-ui/core/Avatar";
import PersonIcon from "@material-ui/icons/Person";

const PlayerHeader = props => {
    return (
        <div className={styles.Container}>
            <Avatar src={props.avatarUri} className={styles.Avatar} alt={props.name}>
                <PersonIcon fontSize={"large"}/>
            </Avatar>
            <h1>{props.name}</h1>
        </div>
    );
};

PlayerHeader.propTypes = {
    name: PropTypes.string.isRequired,
    avatarUri: PropTypes.string,
}

export default PlayerHeader;
