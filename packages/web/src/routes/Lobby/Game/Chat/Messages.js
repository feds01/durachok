import {Virtuoso} from 'react-virtuoso'
import styles from "./index.module.scss";
import Button from "@material-ui/core/Button";
import React, {useEffect, useRef, useState} from 'react';
import {useChatState} from "../../../../contexts/chat";
import VerticalAlignBottomIcon from '@material-ui/icons/VerticalAlignBottom';

const Message = ({name, message, time}) => {
    function formatTime(time) {
        const seconds = Math.floor((time / 1000) % 60).toString();
        const minutes = Math.floor((time / (1000 * 60)) % 60).toString();
        const hours = Math.floor((time / (1000 * 60 * 60)) % 24).toString();

        let formattedTime = `${seconds.padStart(2, "0")}`;

        // Don't include hour component if it's zero
        if (hours > 0) return `${hours}:${minutes.padStart(2, "0")}:` + formattedTime;

        return `${minutes.padStart(1, "0")}:` + formattedTime;
    }

    return (
        <div className={styles.Message}>
            <span>{formatTime(time)}</span>
            <p><b>{name}</b>: {message}</p>
        </div>
    )
};

const Messages = () => {
    const {messages} = useChatState();
    const listRef = useRef(null);

    const [atBottom, setAtBottom] = useState(false)
    const showButtonTimeoutRef = useRef(null)
    const [showButton, setShowButton] = useState(false)

    useEffect(() => {
        return () => {
            clearTimeout(showButtonTimeoutRef.current)
        }

    }, []);

    useEffect(() => {
        clearTimeout(showButtonTimeoutRef.current)

        if (!atBottom) {
            showButtonTimeoutRef.current = setTimeout(() => setShowButton(true), 500)
        } else {
            setShowButton(false)
        }
    }, [atBottom, setShowButton]);

    return (
        <>
            <Virtuoso
                ref={listRef}
                className={styles.Messages}
                initialTopMostItemIndex={messages.length - 1}
                data={messages}
                atBottomStateChange={bottom => {
                    setAtBottom(bottom);
                }}
                itemContent={(index, message) => <Message {...message}/>}
                followOutput={"smooth"}
            />
            {showButton && (
                <div style={{
                    position: "absolute",
                    display: "flex",
                    bottom: 60,
                    width: "100%",
                    flexDirection: "row",
                    justifyContent: "center",
                }}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<VerticalAlignBottomIcon/>}
                        onClick={() => listRef.current.scrollToIndex({index: messages.length - 1, behavior: 'smooth'})}
                    >
                        Bottom
                    </Button>
                </div>

            )}
        </>
    );
}


export default Messages;
