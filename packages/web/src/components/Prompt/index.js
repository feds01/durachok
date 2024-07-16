import clsx from "clsx";
import React from 'react';
import {withRouter} from "react-router";
import {CSSTransition} from 'react-transition-group';

import './index.scss';
import GamePin from "./GamePin";
import GameName from "./GameName";
import GamePassphrase from "./GamePassphrase";
import {getLobby, joinLobby} from "../../utils/networking/lobby";
import {useAuthDispatch, useAuthState} from "../../contexts/auth";


class Prompt extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            stage: 'pin',
            with2FA: false,
            showStages: true,
            pin: null,
            name: "",
            nodeRef: React.createRef(),
        }

        this.onSubmit = this.onSubmit.bind(this);
        this.onError = this.onError.bind(this);
    }

    async componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.pin !== this.props.pin && this.props.pin?.match(/^\d{6}$/g)) {
            // don't show inputs until we figure out what we need show
            this.setState({showStages: false, pin: this.props.pin});

            // verify that the given pin exists, if so set that as the pin number
            // and move onto the name stage.
            await getLobby(this.props.pin).then((res) => {
                if (res.status) {
                    if (this.props.auth.name) {
                        if (!res.data.with2FA) {
                            this.onSubmit();
                        } else {
                            this.setState({
                                with2FA: res.data.with2FA,
                                pin: this.props.pin,
                                stage: 'security',
                                showStages: true,
                            });
                        }
                    } else {
                        this.setState({
                            with2FA: res.data.with2FA,
                            pin: this.props.pin,
                            stage: "name",
                            showStages: true,
                        });
                    }
                } else {
                    this.onError(res.message);
                }
            });
        }
    }

    /**
     * Method that is invoked when the user completes the pin/name entry and
     * is ready to attempt to join the lobby.
     *
     * @param {?String} passphrase - The passphrase for the lobby if the 2 factor auth is
     *        enabled for the current lobby.
     * */
    async onSubmit(passphrase = "") {
        const {pin, with2FA, name} = this.state;

        const credentials = {
            ...name && {name},
            ...(with2FA && {passphrase})
        };

        const res = await joinLobby(pin, credentials);

        if (res.status) {

            // update our local storage with the tokens
            if (res.token && res.refreshToken) {
                this.props.authDispatch({type: "UPDATE_TOKEN", ...res});
            }

            this.props.history.push(`/lobby/${pin}`);
        } else {

            // don't reset the view if this is a lobby with 2fa
            if (with2FA) return res;

            // Attempt to join without tokens since they might be anonymous user tokens
            // for a different game. Try and clear the token, then ask the user to join
            // with a name...

            if (!this.props.auth.name) {
                this.props.authDispatch({type: "UPDATE_TOKEN", ...res});
            }

            this.setState({pin: pin, stage: 'name'});
        }
    }

    onError(message = null, pin = null) {
        this.setState({
            name: "",
            pin: pin,
            error: message,
            stage: "pin",
            showStages: true,
        });
    }

    render() {
        const {stage, showStages, name, error, with2FA, nodeRef, pin} = this.state;

        // Essentially we first render the game pin if the stage is equal to 'pin'. If the 'pin' stage
        // returns a query to progress to the next stage, then we push it to the next stage of 'security'.
        // The next stage requires the user to enter a admin provided game code to finalise the entry into
        // the lobby.
        return (
            <div className={clsx(this.props.className)}>
                {showStages && stage === 'pin' && <GamePin
                    {...error && {error}}
                    onSuccess={async ({pin, with2FA}) => {
                        this.setState({pin});

                        // if the user is logged in with some account, attempt to authenticate them
                        // by using their credentials
                        if (this.props.auth.name) {
                            if (!with2FA) {
                                await this.onSubmit();
                            } else {
                                this.setState({stage: 'security', with2FA});
                            }
                        } else {
                            this.setState({pin: pin, stage: 'name', with2FA});
                        }
                    }}/>}
                {showStages && stage === 'name' && <GameName pin={pin} onSuccess={async (name) => {
                    this.setState({name});

                    if (!with2FA) {
                        await this.onSubmit();
                    } else {
                        this.setState({stage: 'security'});
                    }
                }}/>}

                {stage === "security" && with2FA && (
                    <CSSTransition
                        in={stage === 'security'}
                        nodeRef={nodeRef}
                        timeout={300}
                        appear
                        onEntered={() => this.setState({showStages: false})}
                        onExited={() => this.setState({showStages: true})}
                        classNames={'security'}
                        unmountOnExit
                    >
                        <div ref={nodeRef}>
                            <GamePassphrase
                                name={name}
                                pin={pin}
                                onError={this.onError}
                                onSubmit={this.onSubmit}
                            />
                        </div>
                    </CSSTransition>
                )}
            </div>
        );
    }
}


export default withRouter(React.forwardRef((props, ref) => {
    const auth = useAuthState();
    const authDispatch = useAuthDispatch();

    return (<Prompt innerRef={ref} auth={auth} authDispatch={authDispatch} {...props}/>);
}));
