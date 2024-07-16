import React, {useContext} from 'react';
import styles from "./index.module.scss";
import {useNavigate} from "react-router";
import Button from "@material-ui/core/Button";
import {deleteGame} from "../../utils/networking/lobby";
import {RefreshDashboardContext} from "../../contexts/RefreshDashboard";

const GameCard = (props) => {
    const navigate = useNavigate();
    const refresher = useContext(RefreshDashboardContext);

    // function to invoke a deletion of the current game...
    async function deleteAction(e) {
        e.stopPropagation(); // prevent child event from being propagated to parent.

        await deleteGame(props.pin);

        // invoke a dashboard refresh
        refresher.onRefresh();
    }

    return (
        <div className={styles.GameCard} onClick={() => navigate(`/lobby/${props.pin}`)}>
            <div className={styles.Info}>
                <div className={styles.Title}>
                    <h2>{props.pin}</h2>
                    <p>{props.status}</p>
                </div>

                <div className={styles.Players}>
                    <p>Players: {props.players}/{props.maxPlayers}</p>
                </div>
            </div>

            <div className={styles.Action}>
                <Button variant="contained" onClick={deleteAction} disableElevation style={{backgroundColor: "#f48fb1"}}>
                    Delete
                </Button>
            </div>
        </div>
    );
};

export default GameCard;
