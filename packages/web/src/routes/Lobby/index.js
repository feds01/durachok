/**
 * Module description:   src/routes/Lobby/CardImage.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from "react";
import {io} from "socket.io-client";
import {Prompt, withRouter} from "react-router";


import Game from "./Game";
import CountDown from "./CountDown";
import WaitingRoom from "./WaitingRoom";
import {SOCKET_ENDPOINT} from "../../config";
import ErrorContainer from "./ErrorContainer";
import {ChatProvider} from "../../contexts/chat";
import LoadingScreen from "../../components/LoadingScreen";
import {ClientEvents, error, GameStatus, ServerEvents} from "shared";
import {logout, useAuthDispatch, useAuthState} from "../../contexts/auth";

class LobbyRoute extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            shouldBlockNavigation: false,
            pin: null,
            socket: null,
            isHost: false,
            loaded: false,
            lobby: {},
            error: null,
            stage: GameStatus.WAITING,
        };
    }

    componentDidMount() {
        this._isMounted = true;

        // if the id does not match hello a 6 digit pin, then re-direct the user to home page..
        if (!this.props.match.params.pin.match(/^\d{6}$/g)) {
            this.props.history.push("/");
        } else {
            this.setState({shouldBlockNavigation: true});
        }

        // prevent the user from accidentally navigating off the page...
        window.onbeforeunload = () => true;
        const pin = this.props.match.params.pin;

        const socket = io(SOCKET_ENDPOINT + `/${pin}`, {
            auth: {
                token: this.props.auth.token,
                refreshToken: this.props.auth.refreshToken,
            },
            transports: ["websocket"]
        });

        // client-side
        socket.on("connect", () => {
            socket.emit(ServerEvents.JOIN_GAME);
        });


        // The server disconnected us for some reason... re-direct back to home page and
        // clear the session so the user isn't using stale JWTs
        socket.on(ClientEvents.CLOSE, async (event) => {
            // disable the 'navigation prompt' from alerting the user
            // since a navigation might occur based on the error type.
            this.setState({shouldBlockNavigation: false});

            // clear our token if the user says it's stale...
            if (!this.props.auth.name) {
                await logout(this.props.authDispatch);
            }

            this.props.history.push("/");
        });

        socket.on("connect_error", async (err) => {
            // disable the 'navigation prompt' from alerting the user
            // since a navigation might occur based on the error type.
            this.setState({shouldBlockNavigation: false});

            // ensure that the transmitted 'connection_error' is an
            // error object from the server, then use the connection
            // message string to determine the next action
            if (err instanceof Error) {

                // Authentication related for refreshing tokens. Essentially invoke a
                // re-connection; close the socket, update tokens and then re-open the
                // socket connection with the new tokens.
                if (err.message === "token") {
                    socket.close();

                    // Update our session with the new tokens and the socket query
                    this.props.authDispatch({type: "UPDATE_TOKEN", ...err.data});

                    // @Hack: we're manually digging into the query object of the socket and changing
                    // the query parameters to reflect the new auth tokens. There should be a better way
                    // of doing this, however it does not seem to be the case.
                    // Check out issue: https://github.com/socketio/socket.io/issues/1677
                    socket.auth = {
                        token: this.props.auth.token,
                        refreshToken: this.props.auth.refreshToken,
                    }
                    return socket.connect();
                }

                // if the user is not allowed to join this lobby: re-direct the
                // user back to the home page from where they can re-try to
                // join the lobby
                if (err.message === error.NON_EXISTENT_LOBBY) {
                    this.props.history.push("/");
                } else if (err.message === error.AUTHENTICATION_FAILED) {
                    if (!this.props.auth.name) {
                        await logout(this.props.authDispatch);
                    }

                    this.props.history.push({
                        pathname: "/",
                        state: {pin}
                    });
                }

                // if the user is authenticated but they are trying to join a
                // lobby that already has the maximum players or they are currently
                // in a round, the server will return a error.LOBBY_FULL
                if (err.message === error.LOBBY_FULL) {
                    this.setState({error: error.LOBBY_FULL});
                }
            }

            // re-enable the accidental navigation prevention prompt.
            if (this._isMounted) {
                this.setState({shouldBlockNavigation: true});
            }
        });

        // if the client is successfully authenticated and joined the lobby
        // on the server, then we can begin to load the lobby...
        socket.on(ClientEvents.JOINED_GAME, (message) => {
            this.setState({
                loaded: true,
                ...message,
                stage: message.lobby.status
            });
        });

        // If a new player joins the lobby, we should update the player
        // list
        socket.on(ClientEvents.NEW_PLAYER, (message) => {
            this.setState((oldState) => {
                return {
                    lobby: {
                        ...oldState.lobby,
                        players: message.lobby.players,
                        owner: message.lobby.owner,
                    }
                }
            });
        });

        // set the lobby stage to 'countdown'
        socket.on(ClientEvents.COUNTDOWN, () => {
            this.setState({stage: GameStatus.STARTED});
        });

        // set the lobby stage to 'game'
        socket.on(ClientEvents.GAME_STARTED, () => {
            this.setState({stage: GameStatus.PLAYING});
        });

        this.setState({socket, pin});
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        if (nextState.shouldBlockNavigation) {
            window.onbeforeunload = () => true;
        } else {
            window.onbeforeunload = undefined;
        }

        return true;
    }

    componentWillUnmount() {
        this._isMounted = false;

        // disconnect the socket if a connection was established.
        if (this.state.socket !== null) {
            this.state.socket.offAny(); // remove all listeners on un-mount
            this.state.socket.disconnect();
        }

        // reset the onbeforeunload function since we don't need it if the user
        // redirects.
        window.onbeforeunload = undefined;
    }

    render() {
        const {loaded, stage, shouldBlockNavigation} = this.state;

        return (
            <>
                <Prompt
                    when={shouldBlockNavigation}
                    message={`You can't rejoin the game if you leave, are you sure you want to leave?`}
                />
                {loaded ? (
                    <>
                        {stage === GameStatus.WAITING && <WaitingRoom {...this.state} />}
                        {stage === GameStatus.STARTED && <CountDown/>}
                        {stage === GameStatus.PLAYING && (
                            <ErrorContainer>
                                <ChatProvider disabled={this.state.lobby.disabledChat} chat={this.state.lobby.chat}>
                                    <Game {...this.state} />
                                </ChatProvider>
                            </ErrorContainer>
                        )}
                    </>
                ) : (
                    <LoadingScreen><b>Joining Lobby...</b></LoadingScreen>
                )}
            </>
        )
    }
}

export default withRouter(React.forwardRef((props, ref) => {
    const auth = useAuthState();
    const authDispatch = useAuthDispatch();

    return (<LobbyRoute innerRef={ref} auth={auth} authDispatch={authDispatch} {...props}/>);
}));
