import './index.scss';
import React from 'react';
import GamePin from "./GamePin";
import GameSecurity from "./GameSecurity";
import {CSSTransition} from 'react-transition-group';
import GameName from "./GameName";

class Prompt extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            stage: 'pin',
            pin: null,
            name: "",
            nodeRef: React.createRef(),
        }
    }
    render() {
        const {stage, name, nodeRef, pin} = this.state;

        // Essentially we first render the game pin if the stage is equal to 'pin'. If the 'pin' stage
        // returns a query to progress to the next stage, then we push it to the next stage of 'security'.
        // The next stage requires the user to enter a admin provided game code to finalise the entry into
        // the lobby.
        return (
            <div>
                {stage === 'pin' && <GamePin onSuccess={(pin) => {
                    this.setState({pin: pin, stage: 'name'})
                }}/>}
                {stage === 'name' && <GameName onSuccess={(name) => {
                    this.setState({name: name, stage: 'security'})
                }}/>}

                <CSSTransition
                    in={stage === 'security'}
                    nodeRef={nodeRef}
                    timeout={300}
                    appear
                    classNames={'security'}
                    unmountOnExit
                >
                    <div ref={nodeRef}>
                        <GameSecurity name={name} pin={pin}/>
                    </div>
                </CSSTransition>
            </div>
        );
    }
}


export default React.forwardRef((props, ref) => <Prompt
    innerRef={ref} {...props}
/>);
