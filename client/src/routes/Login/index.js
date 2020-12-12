/**
 * Module description:   src/routes/Lobby/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from "react";
import {Formik} from "formik";
import {login} from "../../utils/networking";
import Input from "../../components/Input";
import Button from "@material-ui/core/Button";
import Loader from "react-loader-spinner";
import {updateTokens} from "../../utils/auth";
import {useHistory} from "react-router";

const LoginRoute = () => {
    const history = useHistory();

    return (
        <Formik
            initialValues={{name: ''}}
            validateOnChange={false}
            validate={(values) => {
                const errors = {};

                if (values.name === "" || !values.name.trim()) errors.name = "Name can't be empty.";
                else if (values.name > 20) errors.name = "Name is too long.";

                if (values.password === "") errors.password = "Password can't be empty.";

                return errors;
            }}
            onSubmit={async (values, {setSubmitting, setErrors}) => {
                // make a request to the API to check if there is a game with the given pin,
                // and if so we'll set the next stage of the prompt (enter the pin).
                const res = await login(values.name, values.password);

                if (!res.status) {
                    setErrors({password: "Invalid credentials."});
                } else {
                    setSubmitting(false);

                    // set the tokens for this client from the login response object
                    updateTokens(res.token, res.refreshToken);

                    history.push("/user")
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
                            placeholder={'Username'}
                            autoFocus
                            error={Boolean(errors.name)}
                            helperText={errors.name || ""}
                            value={values.name}
                            onChange={handleChange}
                        />
                        <Input
                            id={'password'}
                            type={"password"}
                            placeholder={'Password'}
                            error={Boolean(errors.password)}
                            helperText={errors.password || ""}
                            value={values.password}
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

export default LoginRoute;
