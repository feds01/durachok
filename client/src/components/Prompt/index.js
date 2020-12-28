import './index.scss';
import GamePin from "./GamePin";
import GameName from "./GameName";
import GamePassphrase from "./GamePassphrase";
import {joinLobby} from "../../utils/networking";
import {updateTokens} from "./../../utils/auth";

import React from 'react';
import {withRouter} from "react-router";
import {CSSTransition} from 'react-transition-group';

class Prompt extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            stage: 'pin',
            showStages: true,
            pin: null,
            name: "",
            nodeRef: React.createRef(),
        }

        this.onSubmit = this.onSubmit.bind(this);
    }

    async onSubmit(passphrase) {
        const credentials = {name: this.state.name, passphrase};
        const res = await joinLobby(this.state.pin, credentials);

        if (res.status) {

            // update our local storage with the tokens
            updateTokens(res.token, res.refreshToken);

            this.props.history.push(`/lobby/${this.state.pin}`);
        } else {
            // wait a second to register error message and then re-direct to home page
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.props.history.push(`/`);
        }

        // pass the res object back to the GamePassphrase component to display
        // information on the request failing.
        return res;
    }

    render() {
        const {stage, showStages, name, nodeRef, pin} = this.state;

        // Essentially we first render the game pin if the stage is equal to 'pin'. If the 'pin' stage
        // returns a query to progress to the next stage, then we push it to the next stage of 'security'.
        // The next stage requires the user to enter a admin provided game code to finalise the entry into
        // the lobby.
        return (
            <div>
                {showStages && stage === 'pin' && <GamePin onSuccess={(pin) => {
                    this.setState({pin: pin, stage: 'name'})
                }}/>}
                {showStages && stage === 'name' && <GameName pin={pin} onSuccess={(name) => {
                    this.setState({name: name, stage: 'security'})
                }}/>}

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
                            onError={() => {
                                this.setState({
                                    name: "",
                                    pin: null,
                                    stage: "pin"
                                })
                            }}
                            onSubmit={this.onSubmit}
                        />
                    </div>
                </CSSTransition>
            </div>
        );
    }
}


export default withRouter(React.forwardRef((props, ref) => <Prompt innerRef={ref} {...props}/>));
