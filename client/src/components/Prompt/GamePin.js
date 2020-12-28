import React from 'react';
import {Formik} from "formik";
import Input from "../Input";
import Loader from 'react-loader-spinner';
import Button from "@material-ui/core/Button";

const GamePin = (props) => {
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
                // make a request to the API to check if there is a game with the given pin,
                // and if so we'll set the next stage of the prompt (enter the pin).
                await fetch(`/api/lobby/${values.pin}`).then((res) => res.json()).then((res) => {
                    if (!res.status) {
                        setErrors({pin: res.message});
                    } else {
                        setSubmitting(false);
                        props.onSuccess(values.pin);
                    }
                });
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
                        <Input
                            id={'pin'}
                            placeholder={'Enter game PIN'}
                            autoFocus
                            autoComplete={"off"}
                            error={Boolean(errors.pin)}
                            helperText={errors.pin || ""}
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

export default GamePin;
