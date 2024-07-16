/**
 * Module description:   src/routes/Lobby/CardImage.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from "react";
import {Form, Formik} from "formik";
import styles from './index.module.scss';
import {Link} from "react-router-dom";
import {useHistory} from "react-router";
import {motion} from "framer-motion";
import Loader from "react-loader-spinner";
import Button from "@material-ui/core/Button";
import ReCaptcha from "react-google-recaptcha";

import Logo from "../../components/Logo";
import Input from "../../components/Input";
import RegisterSchema from "../../schemas/register";
import {useAuthDispatch} from "../../contexts/auth";
import {registerUser} from "../../contexts/auth/actions";

const RegisterRoute = () => {
    const history = useHistory();
    const dispatch = useAuthDispatch();

    async function onSubmit(values, {setSubmitting, setErrors}) {
        // make a request to the API to check if there is a game with the given pin,
        // and if so we'll set the next stage of the prompt (enter the pin).
        const res = await registerUser(dispatch, values);

        if (!res.status) {
            // The server provides us with a map of errors based on the registration request.
            setErrors(res.errors);
            setSubmitting(false);
        } else {
            // set the tokens for this client from the login response object
            history.push("/user")
        }
    }

    return (
        <Formik
            initialValues={{email: '', name: '', password: ''}}
            validateOnMount={false}
            validationSchema={RegisterSchema}
            onSubmit={onSubmit}
        >
            {props => (
                <RegisterForm {...props}/>
            )}
        </Formik>
    );
};


const RegisterForm = (props) => {
    const captcha = React.createRef();
    const {values, errors, isSubmitting, isValid, handleSubmit, handleBlur, handleChange, setFieldValue} = props;

    return (
        <div className={styles.Container}>
            <Form noValidate autoComplete={"off"}>
                <motion.div
                    transition={{duration: 0.5}}
                    initial={{x: "calc(100vw)"}}
                    animate={{x: 0}}
                    exit={{x: "-100vw"}}
                >
                    <div className={styles.Login}>
                        <Logo size={48}/>
                        <h2>Register</h2>
                        <Input
                            id={'email'}
                            style={{
                                paddingBottom: "8px"
                            }}
                            placeholder={'Email'}
                            autoFocus
                            autoCorrect={"off"}
                            autoCapitalize={"off"}
                            autoComplete={"off"}
                            error={Boolean(errors.email)}
                            helperText={errors.email || ""}
                            value={values.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        <Input
                            name={'name'}
                            style={{paddingBottom: "8px"}}
                            placeholder={'Username'}
                            autoComplete="new-password"
                            error={Boolean(errors.name)}
                            helperText={errors.name || ""}
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        <Input
                            name={'password'}
                            type={"password"}
                            autoComplete="new-password"
                            placeholder={'Password'}
                            error={Boolean(errors.password)}
                            helperText={errors.password || ""}
                            value={values.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        <div className={styles.Captcha}>
                            <ReCaptcha
                                name="recaptcha"
                                sitekey={process.env.REACT_APP_RE_CAPTCHA_SECRET}
                                ref={captcha}
                                theme={"dark"}
                                onChange={(value) => {
                                    setFieldValue("token", value);
                                }}
                            />
                        </div>
                        <Button
                            type={"submit"}
                            variant={'contained'}
                            className={'Prompt-enter'}
                            disableElevation
                            style={{
                                marginTop: 19
                            }}
                            disableRipple
                            disabled={isSubmitting || !isValid}
                            onClick={handleSubmit}
                            color={'primary'}
                        >
                            {isSubmitting ?
                                <Loader type="ThreeDots" color="#FFFFFF" height={20}
                                        width={40}/> : "Register"}
                        </Button>
                        <p className={styles.Alternative}>
                            Already registered? Login <Link to={"/login"}>here</Link>
                        </p>
                    </div>
                </motion.div>
            </Form>
        </div>
    )
}

export default RegisterRoute;
