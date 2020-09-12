import './index.scss';
import React, {useState} from 'react';
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";

const Prompt = () => {
    const [input, setInput] = useState('');

    return (
        <div className={'Prompt'}>
            <TextField
                className={'Prompt-code'}
                placeholder={'Enter game PIN'}
                autoFocus
                inputProps={{
                    style:
                        {
                            textAlign: 'center',
                            color: '#dad8ec',
                            width: 360,
                            fontSize: 20,
                            letterSpacing: 2
                        }
                }}
                color={'white'}
                variant={'filled'}
                value={input}
                onChange={(e) => {
                    e.preventDefault();

                    // Set the value of the input to our local state
                    setInput(e.target.value);
                }}
            />
            <Button
                variant={'contained'}
                className={'Prompt-enter'}
                disableElevation
                disableRipple
                color={'primary'}
            >
                Enter
            </Button>
        </div>
    );
};

export default Prompt;
