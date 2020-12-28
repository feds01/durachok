import React from 'react';
import {Formik} from "formik";
import Loader from 'react-loader-spinner';
import Button from "@material-ui/core/Button";
import {checkName} from "../../utils/networking";
import Input from "../Input";

const GameName = (props) => {
    return (
        <Formik
            initialValues={{name: ''}}
            validateOnChange={false}
            validate={(values) => {
                const errors = {};

                if (values.name === "" || !values.name.trim()) errors.name = "Name can't be empty.";
                else if (values.name > 20) errors.name = "Name is too long.";

                return errors;
            }}
            onSubmit={async (values, {setSubmitting, setErrors}) => {
                // make a request to the API to check if there is a game with the given pin,
                // and if so we'll set the next stage of the prompt (enter the pin).
                const nameCheck = await checkName(props.pin, values.name)

                if (!nameCheck.status) {
                    setErrors({name: "Name already taken."});
                } else {
                    setSubmitting(false);
                    props.onSuccess(values.name);
                }
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
                            id={'name'}
                            placeholder={'Enter name'}
                            autoFocus
                            autoComplete={"off"}
                            error={Boolean(errors.name)}
                            helperText={errors.name || ""}
                            value={values.name}
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
                            {isSubmitting ? <Loader type="ThreeDots" color="#FFFFFF" height={20} width={40}/> : "Enter"}
                        </Button>
                    </div>
                );
            }}
        </Formik>
    );
};

export default GameName;
