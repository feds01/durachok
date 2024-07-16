import clsx from "clsx";
import PropTypes from "prop-types";
import React, {useState} from 'react';
import styles from './index.module.scss';
import Badge from "@material-ui/core/Badge";
import WhiteButton from "../../../../components/WhiteButton";
import SettingsIcon from '@material-ui/icons/Settings';
import ChatBubbleIcon from '@material-ui/icons/ChatBubble';

import {useChatDispatch, useChatState} from "../../../../contexts/chat";
import GameSettingsDialog from "../../../../components/GameSettingsDialog";

const Header = props => {
    const [settingsDialog, setSettingsDialog] = useState(false);
    const {unreadCount, opened} = useChatState();
    const dispatchChat = useChatDispatch();

    return (
        <div className={clsx(props.className, styles.Container)}>
            <WhiteButton
                disableRipple
                onClick={() => setSettingsDialog(true)}
                aria-label="settings"
            >
                <SettingsIcon fontSize={"large"}/>
            </WhiteButton>


            {
                !opened && (
                    <WhiteButton
                        disableRipple
                        onClick={() => dispatchChat({type: "TOGGLE_CHAT"})}
                        aria-label="chat"
                    >
                        <Badge badgeContent={unreadCount} variant={"dot"} color="secondary">
                            <ChatBubbleIcon fontSize={"large"}/>
                        </Badge>
                    </WhiteButton>
                )
            }

            <GameSettingsDialog open={settingsDialog} onClose={() => setSettingsDialog(false)}/>
        </div>
    );
};

Header.propTypes = {
    className: PropTypes.string,
    countdown: PropTypes.number.isRequired,
    resetCount: PropTypes.number,
};

Header.defaultProps = {
    countdown: 300,
}

export default Header;
