import {Form, Formik, yupToFormErrors} from "formik";
import React, {useEffect, useState} from 'react';
import settingStyles from "../index.module.scss";
import {useAuthDispatch, useAuthState} from "../../../../contexts/auth";
import UserDetailsSchema from "../../../../schemas/register";


import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/Visibility";
import withStyles from "@material-ui/core/styles/withStyles";
import InputAdornment from "@material-ui/core/InputAdornment";
import {updateUserDetails} from "../../../../utils/networking/user";

const SettingField = withStyles({
    root: {
        '& .Mui-focused.MuiInputAdornment-root': {

        },

        '& label, label.Mui-focused': {
            color: 'rgba(172, 170, 190, 1)',
        },

        '& .MuiFormHelperText-root:not(.Mui-error)': {
            color: 'rgba(172, 170, 190, 1)',
        },

        '& input': {
            color: 'rgba(172, 170, 190, 1)',
        },
        '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
                borderColor: 'rgba(172, 170, 190, 1)',
            },
            '&.Mui-focused fieldset': {
                borderColor: 'rgba(172, 170, 190, 1)',
            },
        },
    },
})(TextField);

const UpdateUserDetails = () => {
    const {name, email} = useAuthState();
    const authDispatch = useAuthDispatch();
    const [submitText, setSubmitText] = useState("update");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        let timeout;

        if (submitText !== "update") {
            // queue a 2 second function to reset the status to an empty string
            timeout = setTimeout(() => {setSubmitText("update")}, 2000);
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        }
    }, [submitText ]);

    async function submit(values, actions) {
        updateUserDetails(values).then((res) => {
            if (!res.status) {
                actions.setErrors(res.errors);
            } else {
                // we need to update our internal information for auth...
                authDispatch({type: "UPDATE_CREDENTIALS", payload: res.credentials});


                setSubmitText("updated!");
            }
        });
    }

    useEffect(() => {

    }, []);

    return (
        <Formik
            initialValues={{name, email, password: ""}}
            validate={(values) => {
                return UserDetailsSchema
                    .validate(values, { abortEarly: false, context: {strict: false} })
                    .then(() => {})
                    .catch(err => {
                        return yupToFormErrors(err);
                    });
            }}
            onSubmit={submit}>
            {(props => {
                const {values, handleChange, handleBlur, errors} = props;

                return (
                    <Form>
                        <section className={settingStyles.Details}>
                            <h2>Update User Details</h2>
                            <Divider style={{width: "100%"}}/>
                            <p>
                                Update your user account details by replacing the current information in the fields. You
                                will not
                                be able to update your name or email to one that is already taken by another user.
                            </p>
                            <SettingField
                                className={settingStyles.Input}
                                label="Name"
                                id="name"
                                error={Boolean(errors.name)}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                fullWidth
                                helperText={errors.name ?? "Update your user name"}
                                value={values.name}
                            />
                            <SettingField
                                label="Email"
                                className={settingStyles.Input}
                                error={Boolean(errors.email)}
                                id="email"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                fullWidth
                                helperText={errors.email ?? "Update your email"}
                                value={values.email}
                            />
                            <SettingField
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                className={settingStyles.Input}
                                id="password"
                                error={Boolean(errors.password)}
                                onChange={handleChange}
                                fullWidth
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                style={{color: "rgba(172, 170, 190, 1)"}}
                                                aria-label="toggle password visibility"
                                                onClick={() => setShowPassword(!showPassword)}
                                                onMouseDown={() => setShowPassword(!showPassword)}
                                                edge="end"
                                            >
                                                {showPassword ? <Visibility/> : <VisibilityOff/>}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                onBlur={handleBlur}
                                helperText={errors.password ?? "Update your password"}
                                value={values.password}
                            />
                            <Button variant={"contained"} type={"submit"}>
                                {submitText}
                            </Button>
                        </section>
                    </Form>
                )
            })}
        </Formik>
    )
}


UpdateUserDetails.propTypes = {
};

export default UpdateUserDetails;
