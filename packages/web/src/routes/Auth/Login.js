/**
 * Module description:   src/routes/Lobby/CardImage.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from "react";
import * as Yup from "yup";
import {Formik} from "formik";
import styles from './index.module.scss';
import {Link} from "react-router-dom";
import {useHistory} from "react-router";
import {motion} from "framer-motion";
import Loader from "react-loader-spinner";
import Button from "@material-ui/core/Button";

import Logo from "../../components/Logo";
import Input from "../../components/Input";
import {loginUser, useAuthDispatch} from "../../contexts/auth";


const LoginSchema = Yup.object().shape({
    name: Yup.string()
        .matches(/^[^\s]{1,20}$/, "Name cannot have spaces")
        .max(20, "Name too long")
        .required('Required'),
    password: Yup.string()
        .required('Required'),
});

const LoginRoute = () => {
    const history = useHistory();
    const dispatch = useAuthDispatch();

    async function onSubmit(values, {setSubmitting, setErrors}) {
        // make a request to the API to check if there is a game with the given pin,
        // and if so we'll set the next stage of the prompt (enter the pin).
        const res = await loginUser(dispatch, values.name, values.password);

        if (!res.status) {
            setErrors({password: "Invalid credentials."});
        } else {
            setSubmitting(false);

            // TODO: re-direct user to where they were from
            history.push("/user");
        }
    }


    return (

        <Formik
            initialValues={{name: '', password: ''}}
            validateOnBlur
            validationSchema={LoginSchema}
            onSubmit={onSubmit}
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
                    <div className={styles.Container}>
                        <motion.div
                            transition={{duration: 0.5}}
                            initial={{x: "calc(-100vw)"}}
                            animate={{x: 0}}
                            exit={{x: "100vw"}}
                        >
                            <div className={styles.Login}>
                                <Logo size={48}/>
                                <h2>Login</h2>
                                <Input
                                    id={'name'}
                                    style={{
                                        paddingBottom: "8px"
                                    }}
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
                                    type={"submit"}
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
                                    {isSubmitting ?
                                        <Loader type="ThreeDots" color="#FFFFFF" height={20} width={40}/> : "Login"}
                                </Button>
                                <p className={styles.Alternative}>
                                    New User? Create account <Link to={"/register"}>here</Link>
                                </p>
                            </div>
                        </motion.div>
                    </div>
                );
            }}
        </Formik>
    );
};

export default LoginRoute;
