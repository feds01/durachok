import React, {Component} from 'react';
import clsx from "clsx";
import styles from "./index.module.scss";
import Passphrase from "../../../components/Passphrase";
import PlayerCounter from "../../../components/PlayerCounter";
import Logo from "../../../components/Logo";
import Button from "@material-ui/core/Button";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";
import StarBorderOutlined from "@material-ui/icons/StarBorderOutlined";

class WaitingRoom extends Component {
    render() {
        const {isHost, id, ws, lobby} = this.props;

        return (
            <div>
                <div className={clsx({[styles.Header]: !isHost, [styles.HostHeader]: isHost})}>
                    <h1>Lobby {id}</h1>
                    {isHost && (
                        <Passphrase ws={ws} timeout={20} passphrase={lobby.passphrase.split("")}/>
                    )}
                </div>

                <div className={styles.SubHeader}>
                    <PlayerCounter
                        style={{
                            justifySelf: "start"
                        }}
                        count={lobby.players.length}/>
                    <Logo size={48}/>
                    {isHost && (
                        <Button
                            variant={'contained'}
                            disableElevation
                            disableRipple
                            style={{
                                justifySelf: "end",
                                height: 40
                            }}
                            onClick={() => {

                                // emit the 'game_start' event and let all other clients
                                // begin the 'countdown stage.
                                ws.emit("start_game");
                            }}
                            disabled={lobby.players.length < 2}
                            color={'primary'}
                            endIcon={<ArrowForwardIosIcon/>}
                        >
                            Start
                        </Button>
                    )}
                </div>

                <div className={styles.Players}>
                    {
                        lobby.players.map((player, index) => {
                            if (player === lobby.owner) {
                                return (<div key={index}>{player} <StarBorderOutlined/></div>);
                            } else {
                                return (<div key={index}>{player}</div>);
                            }
                        })
                    }
                </div>
            </div>
        );
    }
}

export default WaitingRoom;
