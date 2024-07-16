import PropTypes from "prop-types";
import React, {useEffect} from 'react';
import styles from "./index.module.scss";
import Drawer from "@material-ui/core/Drawer";
import Divider from "@material-ui/core/Divider";
import {makeStyles} from "@material-ui/core/styles";
import ArrowRightAltIcon from '@material-ui/icons/ArrowRightAlt';

import Messages from "./Messages";
import ChatInput from "./ChatInput";
import {ClientEvents} from "shared";
import WhiteButton from "../../../../components/WhiteButton";
import {useChatDispatch, useChatState} from "../../../../contexts/chat";

const drawerWidth = 300;

// styles for the drawer chat component.
const useStyles = makeStyles((theme) => ({
    drawer: {
        width: drawerWidth,
        flexShrink: 0,
        display: "flex",
    },
    drawerPaper: {
        flexShrink: 0,
        backgroundColor: "#26262c !important",
        width: drawerWidth,
    },
}));

const Chat = (props) => {
    const classes = useStyles();
    const {opened} = useChatState();
    const dispatchChat = useChatDispatch();

    useEffect(() => {
        props.socket.on(ClientEvents.MESSAGE, (message) => {
            dispatchChat({type: "PUT_MESSAGE", message});
        });

        // eslint-disable-next-line
    }, []);

    return (
        <Drawer
            className={classes.drawer}
            variant={"persistent"}
            anchor={"right"}
            open={opened}
            PaperProps={{
                style: {"height": "100%", "position": "relative"}
            }}
            classes={{
                paper: classes.drawerPaper,
            }}
        >
            <div className={styles.Container}>
                <div className={styles.Header}>
                    <WhiteButton
                        disableRipple
                        onClick={() => dispatchChat({type: "TOGGLE_CHAT"})}
                        aria-label="chat"
                    >
                        <ArrowRightAltIcon fontSize={"large"}/>
                    </WhiteButton>
                    <h2>Game chat</h2>
                </div>
                <Divider/>
                <div className={styles.Chat}>
                    <div className={styles.ChatBox}>
                        <Messages/>
                    </div>
                    <Divider/>
                    <div className={styles.ChatActions}>
                        <ChatInput socket={props.socket}/>
                    </div>
                </div>
            </div>
        </Drawer>
    );
};

Chat.propTypes = {
    socket: PropTypes.object.isRequired,
};

export default Chat;
