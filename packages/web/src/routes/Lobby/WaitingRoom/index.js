import clsx from "clsx";
import PropTypes from "prop-types";
import React, {Component} from 'react';
import styles from "./index.module.scss";
import Button from "@material-ui/core/Button";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";


import {ServerEvents} from "shared";
import Logo from "../../../components/Logo";
import PlayerItem from "../../../components/PlayerItem";
import Passphrase from "../../../components/Passphrase";
import PlayerCounter from "../../../components/PlayerCounter";

class WaitingRoom extends Component {
    constructor(props) {
        super(props);

        this.onKick = this.onKick.bind(this);
        this.startGame = this.startGame.bind(this);
    }


    /**
     * Function to send a 'kick' request to the server for a specific player
     * within the lobby which is specified by name.
     *
     * @param {string} id - The id of the player.
     * */
    onKick(id) {
        this.props.socket.emit(ServerEvents.KICK_PLAYER, {id});
    }

    startGame() {
        // emit the 'game_start' event and let all other clients
        // begin the 'countdown stage.
        this.props.socket.emit(ServerEvents.START_GAME);
    }


    render() {
        const {isHost, pin, socket, lobby} = this.props;

        return (
            <div>
                <div className={clsx({[styles.Header]: !isHost, [styles.HostHeader]: isHost})}>
                    <h1>Lobby {pin}</h1>
                    {isHost && lobby.with2FA && (
                        <Passphrase socket={socket} timeout={20} passphrase={lobby.passphrase.split("")}/>
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
                            onClick={this.startGame}
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
                        lobby.players.map((player, index) => (
                            <PlayerItem
                                key={index}
                                isOwner={player.name === lobby.owner}
                                name={player.name}
                                isHost={isHost}
                                {...(isHost && {
                                    onKick: () => this.onKick(player._id),
                                })}
                            />
                        ))
                    }
                </div>
            </div>
        );
    }
}

WaitingRoom.propTypes = {
    isHost: PropTypes.bool.isRequired,
    pin: PropTypes.string.isRequired,
    socket: PropTypes.object.isRequired,
    lobby: PropTypes.object,
}


export default WaitingRoom;
