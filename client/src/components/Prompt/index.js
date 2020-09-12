import './index.scss';
import React from 'react';
import {Formik} from "formik";
import Loader from 'react-loader-spinner';
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";

const Prompt = () => {
    return (
        <Formik
            initialValues={{pin: ''}}
            validateOnChange={false}
            validate={(values) => {
                const errors = {};

                if (!values.pin.match(/^[0-9]*$/gm)) errors.pin = 'Game PIN should be numerical.';
                else if (values.pin.length !== 6) errors.pin = 'Game PIN is 6 digits long.';

                return errors;
            }}
            onSubmit={async (values, {setSubmitting, setErrors}) => {
                // await new Promise(res => setTimeout(res, 500));

                // make a request to the API to check if there is a game with the given pin,
                // and if so we'll set the next stage of the prompt (enter the pin).
                if (values.pin === '123456') console.log('yay!')
                else setErrors({pin: "Invalid game PIN."})

                setSubmitting(false);
            }}
        >
            {props => {
                const {
                    values,
                    errors,
                    isSubmitting,
                    handleSubmit,
                    handleChange
                } = props;

                return (
                    <div className={'Prompt'}>
                        <TextField
                            id={'pin'}
                            className={'Prompt-code'}
                            placeholder={'Enter game PIN'}
                            autoFocus
                            error={Boolean(errors.pin)}
                            helperText={errors.pin || ""}
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
                            value={values.pin}
                            onChange={handleChange}
                        />
                        <Button
                            variant={'contained'}
                            className={'Prompt-enter'}
                            disableElevation
                            style={{
                                marginTop: 19
                            }}
                            disableRipple
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                            color={'primary'}
                        >
                            {isSubmitting ? <Loader type="ThreeDots" color="#FFFFFF" height={20} width={40} /> : "Enter"}
                        </Button>
                    </div>
                );
            }}
        </Formik>
    );
};

export default Prompt;
