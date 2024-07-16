import * as Yup from "yup";

const RegisterSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').when('$strict', {
        is: false,
        then: Yup.string(),
        otherwise: Yup.string().required("Required"),
    }),
    token: Yup.string().when('$strict', {
        is: false,
        then: Yup.string(),
        otherwise: Yup.string().required("Required"),
    }),
    name: Yup.string()
        .when('$strict', {
            is: false,
            then: Yup.string(),
            otherwise: Yup.string().required("Required"),
        })
        .matches(/^[^\s]{1,20}$/, "Name cannot have spaces")
        .max(20, "Name too long"),
    password: Yup.string()
        .when('$strict', {
            is: false,
            then: Yup.string().notRequired(),
            otherwise: Yup.string()
                .min(8, "Password too short")
                .max(30, "Password too long")
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$@!%&*?])[A-Za-z\d#$@!%&*?]{8,30}$/, "Password must include a special character, one uppercase character, and a number")
                .required("Required"),
        })
});

export default RegisterSchema;
