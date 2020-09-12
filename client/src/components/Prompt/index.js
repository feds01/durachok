import './index.scss';
import React from 'react';
import GamePin from "./GamePin";
import GameSecurity from "./GameSecurity";
import {CSSTransition} from 'react-transition-group';

class Prompt extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            stage: 'pin',
            pin: undefined,
        }
    }

    render() {
        const {stage, pin} = this.state;

        // Essentially we first render the game pin if the stage is equal to 'pin'. If the 'pin' stage
        // returns a query to progress to the next stage, then we push it to the next stage of 'security'.
        // The next stage requires the user to enter a admin provided game code to finalise the entry into
        // the lobby.
        return (
            <div>
                {stage === 'pin' && <GamePin onSuccess={(pin) => {
                    this.setState({pin: pin, stage: 'security'})
                }}/>}
                <CSSTransition
                    in={stage === 'security'}
                    timeout={300}
                    appear
                    classNames={'security'}
                    unmountOnExit
                >
                    <GameSecurity pin={pin}/>
                </CSSTransition>
            </div>
        );
    }
}

export default Prompt;
