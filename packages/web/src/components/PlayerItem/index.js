import React from 'react';
import PropTypes from 'prop-types';
import styles from './index.module.scss';
import ClearIcon from '@material-ui/icons/Clear';
import StarBorderOutlined from "@material-ui/icons/StarBorderOutlined";
import IconButton from "@material-ui/core/IconButton";

const PlayerItem = props => {
    return (
        <div className={styles.Name}>
                <div>
                    {props.name}
                    {props.isOwner && <StarBorderOutlined/>}
                </div>
            {!props.isOwner && props.isHost && (
                <IconButton
                    disableRipple
                    disableFocusRipple
                    disableTouchRipple
                    className={styles.Button}
                    size={"small"}
                    aria-label="delete"
                    onClick={props.onKick}
                >
                    <ClearIcon/>
                </IconButton>
            )}
        </div>
    );
};

PlayerItem.propTypes = {
    isHost: PropTypes.bool.isRequired,
    isOwner: PropTypes.bool.isRequired,
    name: PropTypes.string.isRequired,
    onKick: PropTypes.func,
};

export default PlayerItem;
