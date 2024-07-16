import React from 'react';
import * as Yup from "yup";
import PropTypes from "prop-types";
import {Form, Formik} from "formik";
import Loader from 'react-loader-spinner';
import Button from "@material-ui/core/Button";

import Input from "../Input";
import {getLobby} from "../../utils/networking/lobby";

const PinSchema = Yup.object().shape({
    pin: Yup.string().matches(/^\d{6}$/g, "Game PIN is 6 digits long."),
});

const GamePin = (props) => {
    return (
        <Formik
            initialValues={{pin: ''}}
            {...props.error && {initialErrors: {pin: props.error}}}
            validateOnChange={false}
            validationSchema={PinSchema}
            onSubmit={async (values, {setSubmitting, setErrors}) => {
                // make a request to the API to check if there is a game with the given pin,
                // and if so we'll set the next stage of the prompt (enter the pin).
                await getLobby(values.pin).then((res) => {
                    if (!res.status) {
                        setErrors({pin: res.message});
                    } else {
                        setSubmitting(false);
                        props.onSuccess({...res.data});
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
                    <Form>
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
                                type={"submit"}
                                disabled={isSubmitting}
                                onClick={handleSubmit}
                                color={'primary'}
                            >
                                {isSubmitting ?
                                    <Loader type="ThreeDots" color="#FFFFFF" height={20} width={40}/> : "Enter"}
                            </Button>
                        </div>
                    </Form>
                );
            }}
        </Formik>
    );
};

GamePin.propTypes = {
    error: PropTypes.string,
    onSuccess: PropTypes.func.isRequired,
}

export default GamePin;
