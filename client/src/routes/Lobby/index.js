/**
 * Module description:   src/routes/Lobby/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from "react";
import clsx from "clsx";
import {io} from "socket.io-client";
import {withRouter} from "react-router";
import Divider from "@material-ui/core/Divider";
import StarBorderOutlined from "@material-ui/icons/StarBorderOutlined";

import * as error from "../../error";
import styles from "./index.module.scss";
import {getAuthTokens} from "../../utils/auth";
import LoadingScreen from "../../components/LoadingScreen";
import Passphrase from "../../components/Passphrase";
import Logo from "../../components/Logo";

class LobbyRoute extends React.Component {
    constructor(props) {
        super(props);

        this.state = {id: null, ws: null, isHost: false, loaded: false, lobby: {}, error: null};
    }

    componentDidMount() {
        const id = this.props.match.params.id;
        const socket = io(`localhost:5000/${id}`, {query: getAuthTokens(), transports: ["websocket"]});

        // client-side
        socket.on("connect", () => {
            socket.emit("join_game", {});
        });

        socket.on("connect_error", err => {

            // ensure that the transmitted 'connection_error' is an
            // error object from the server, then use the connection
            // message string to determine the next action
            if (err instanceof Error) {

                // if the user is not allowed to join this lobby: re-direct the
                // user back to the home page from where they can re-try to
                // join the lobby
                if (err.message === error.AUTHENTICATION_FAILED || err.message === error.NON_EXISTENT_LOBBY) {
                    this.props.history.push("/");
                }

                // if the user is authenticated but they are trying to join a
                // lobby that already has the maximum players or they are currently
                // in a round, the server will return a error.LOBBY_FULL
                if (err.message === error.LOBBY_FULL) {
                    this.setState({error: error.LOBBY_FULL});
                }
            }

            console.log(err instanceof Error); // true
            console.log(err.message); // not authorized
            console.log(err.data); // { content: "Please retry later" }
        });


        // if the client is successfully authenticated and joined the lobby
        // on the server, then we can begin to load the lobby...
        socket.on("joined_game", (message) => {
            // console.log("players: ", message);
            this.setState({
                loaded: true,
                ...message
            });
        });

        // If a new player joins the lobby, we should update the player
        // list
        socket.on("new_player", (message) => {
            this.setState((oldState) => {
                return {
                    lobby: {
                        ...oldState.lobby,
                        players: message.lobby.players,
                        owner: message.lobby.owner,
                    }
                }
            });
        })

        this.setState({
            ws: socket,
            id: id
        });
    }

    componentWillUnmount() {
        // disconnect the socket if a connection was established.
        if (this.state.ws !== null) {
            this.state.ws.disconnect();
        }
    }

    render() {
        const {id, isHost, loaded, lobby} = this.state;

        if (!loaded) {
            return <LoadingScreen><b>Joining Lobby...</b></LoadingScreen>
        } else {
            return (
                <div>
                    <div className={clsx({[styles.Header]: !isHost, [styles.HostHeader]: isHost})}>
                        <h1>Lobby {id}</h1>
                        {isHost && (
                            <Passphrase passphrase={lobby.passphrase.split("")}/>
                        )}
                    </div>
                    <Divider style={{backgroundColor: "rgba(172, 170, 190, 1)"}}/>

                    <div className={styles.SubHeader}>
                        <div>
                            <span>{lobby.players.length}</span>
                            <p>players</p>
                        </div>
                        <Logo/>
                        {isHost && (
                            <p>Start Game</p>
                        )}
                    </div>
                    <Divider style={{backgroundColor: "rgba(172, 170, 190, 1)"}}/>

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
}

export default withRouter(LobbyRoute);
