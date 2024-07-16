import clsx from "clsx";
import React from 'react';
import PropTypes from 'prop-types';
import styles from "./index.module.scss";
import Badge from "@material-ui/core/Badge";
import Avatar from "@material-ui/core/Avatar";
import PersonIcon from '@material-ui/icons/Person';
import withStyles from "@material-ui/core/styles/withStyles";

import {ReactComponent as Crown} from "./../../../../assets/icons/crown.svg";
import {ReactComponent as Shield} from "./../../../../assets/icons/shield.svg";
import {ReactComponent as Swords} from "./../../../../assets/icons/swords.svg";

export const StatusIcon = React.memo(({className, isDefending, out}) => {

    return (
        <div
            className={clsx(styles.StatusIcon, className)}
        >
            {out ? <Crown/> : (isDefending ? <Shield/> : <Swords/>)}
        </div>
    );
})

StatusIcon.propTypes = {
    className: PropTypes.string,
    out: PropTypes.bool.isRequired,
    isDefending: PropTypes.bool.isRequired,
}

const StatusBadge = withStyles(() => ({
    badge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#3f51b5',
    },
}))(Badge);

const Player = props => {
    const onClick = () => props.onClick(props.name);

    return (
        <div className={styles.Container} {...props.onClick && {onClick}}>
            <StatusBadge
                overlap="circular"
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                badgeContent={<StatusIcon isDefending={props.isDefending} out={props.out}/>}
            >
                <Avatar
                    alt={props.name}
                    {...!props.avatarUri && {style: {background: "#1a1d3d"}}}
                    {...props.avatarUri && {src: props.avatarUri}}
                    className={clsx(styles.Avatar, {
                        [styles.Starting]: props.beganRound && !props.turned,
                        [styles.Turned]: props.turned && !props.out,
                        [styles.Out]: props.out,
                        [styles.Clickable]: typeof props.onClick !== 'undefined',
                    })}
                >
                    {!props.avatarUri && <PersonIcon/>}
                </Avatar>
            </StatusBadge>
            <span className={styles.Text}>{props.name} {!props.out && (`- ${Array.isArray(props.deck) ? props.deck.length : props.deck}`)}</span>
        </div>
    );
};

Player.propTypes = {
    avatarUri: PropTypes.string,
    name: PropTypes.string.isRequired,
    deck: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.number]).isRequired,
    onClick: PropTypes.func,
    isDefending: PropTypes.bool.isRequired,
    out: PropTypes.any,
    turned: PropTypes.bool,
};

export default Player;
