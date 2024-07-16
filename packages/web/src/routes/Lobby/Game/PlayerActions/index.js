import clsx from "clsx";
import PropTypes from 'prop-types';
import styles from './index.module.scss';
import Button from "@material-ui/core/Button";
import ClearIcon from '@material-ui/icons/Clear';
import React, {useEffect, useState} from 'react';
import {experimentalStyled} from "@material-ui/core";

import {StatusIcon} from "../Player";
import {useGameState} from "../GameContext";
import {MoveTypes, ServerEvents} from "shared";
import {deepEqual} from "../../../../utils/equal";
import {getSetting} from "../../../../utils/settings";
import {generateSortMoves, sort} from "../../../../utils/movement";

const WhiteButton = experimentalStyled(Button)(({theme}) => ({
    color: theme.palette.getContrastText("#e0e0e0"),
    backgroundColor: "#e0e0e0",
    margin: "0 8px 0 0",
    '&:hover': {
        backgroundColor: "#e0e0e0",
    },
}));

const PlayerActions = props => {
    const [allowedToSkip, setAllowedToSkip] = useState(true)
    const [statusText, setStatusText] = useState("");
    const [sortBySuit, setSortBySuit] = useState(false);
    const {out, canAttack, turned, deck, isDefending} = useGameState();

    useEffect(() => {
        if (out) setStatusText("VICTORY");
        else setStatusText(isDefending ? "DEFENDING" : (canAttack ? "ATTACKING" : "WAITING"));

    }, [isDefending, canAttack, out]);

    useEffect(() => {
        setAllowedToSkip(!turned);
    }, [props.canForfeit, turned]);


    function sendForfeit() {
        props.socket.emit(ServerEvents.MOVE, { type: MoveTypes.FORFEIT});
        setAllowedToSkip(false);
    }

    function sortCards() {
        // See if user has enabled card sort animation
        if (getSetting("animateCardSort") && deck.length <= getSetting("maxAnimationItems")) {
            const moves = generateSortMoves(deck, sortBySuit);

            if (moves.length !== 0) {
                props.moveCards(moves);
            }
        } else {
            const cards = sort(deck, sortBySuit);

            // No point of re-rendering if the order didn't change.
            if (!deepEqual(deck, cards)) {
                props.setCards(cards);
            }
        }

        setSortBySuit(!sortBySuit);
    }

    return (
        <div className={clsx(props.className, styles.Container)}>
            <div>
                <WhiteButton
                    ref={props.skipRef}
                    variant="contained"
                    onClick={sendForfeit}
                    disabled={!props.canForfeit || !allowedToSkip}
                    endIcon={<ClearIcon/>}
                >
                    {isDefending ? "forfeit" : "skip"}
                </WhiteButton>
                <WhiteButton
                    ref={props.sortRef}
                    variant="contained"
                    onClick={sortCards}
                    disabled={props.isDragging}
                >
                    Sort by {sortBySuit ? "suit" : "numeric"}
                </WhiteButton>
            </div>

            <div style={{display: "inline-flex"}}>
                <div className={styles.Count}>{deck.length}</div>
                <div className={styles.Status}>
                    <StatusIcon out={out} isDefending={isDefending}/>
                    <span>{statusText}</span>
                </div>
            </div>
        </div>
    );
};

PlayerActions.propTypes = {
    className: PropTypes.string,
    isDragging: PropTypes.bool.isRequired,

    // actions
    moveCards: PropTypes.func,
    setCards: PropTypes.func.isRequired,

    // refs
    sortRef: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.shape({current: PropTypes.instanceOf(Element)})
    ]),

    skipRef: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.shape({current: PropTypes.instanceOf(Element)})
    ]),

    canForfeit: PropTypes.bool.isRequired,
    socket: PropTypes.object.isRequired,
};


PlayerActions.defaultProps = {
    canForfeit: false,
};

export default PlayerActions;
