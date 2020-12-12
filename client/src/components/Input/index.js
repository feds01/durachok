import React from 'react';
import TextField from "@material-ui/core/TextField";

const Input = (inputProps) => {
    return (
        <TextField
            {...inputProps}
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
            variant={'filled'}
        />
    );
};

export default Input;
