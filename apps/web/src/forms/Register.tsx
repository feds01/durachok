import ReCAPTCHA from "react-google-recaptcha";
import { useForm } from "react-hook-form";

import ControlledPasswordField from "@/components/ControlledPasswordField";
import ControlledTextField from "@/components/ControlledTextField";
import SubmitButton from "@/components/SubmitButton";
import { APP_ENV, RE_CAPTCHA_SECRET } from "@/config";
import { AuthResult, RegisterFormData, RegisterFormSchema } from "@/types/auth";
import trpc from "@/utils/trpc";
import { css } from "@emotion/css";
import { zodResolver } from "@hookform/resolvers/zod";

type Props = {
    onSuccess: (result: AuthResult) => void;
};

const submitStyle = css`
    height: 60px;
    font-size: 2em !important;
    background-color: #3f51b5 !important;
    margin-top: 19px !important;

    &:hover {
        background-color: #3f51b5 !important;
    }
`;

export default function Register({ onSuccess }: Props) {
    const loginWith = trpc.auth.register.useMutation();
    const form = useForm<RegisterFormData>({
        resolver: zodResolver(RegisterFormSchema),
        mode: "onBlur",
        reValidateMode: "onChange",
        defaultValues: {
            name: "",
            email: "",
            password: "",
            passwordConfirmation: "",
            reCaptchaToken: "",
        },
    });

    const onSubmit = async (formData: RegisterFormData) => {
        try {
            const result = await loginWith.mutateAsync(formData);
            await onSuccess(result);
        } catch (e: unknown) {
            if (e instanceof Error) {
                // @@Todo: use the error-util to convert this into dorm errors.
                form.setError("password", {
                    type: "manual",
                    message: e.message,
                });
            }
        }
    };

    return (
        <form
            className={css`
                flex-grow: 1;
                display: flex;
                flex-direction: column;
            `}
            onSubmit={form.handleSubmit(onSubmit)}
        >
            <ControlledTextField
                name="name"
                control={form.control}
                textFieldProps={{
                    placeholder: "Username",
                    autoFocus: true,
                    autoComplete: "off",
                }}
            />
            <ControlledTextField
                name="email"
                control={form.control}
                textFieldProps={{
                    placeholder: "Email",
                    autoFocus: true,
                    autoComplete: "off",
                    sx: {
                        pt: "2em",
                    },
                }}
            />
            <ControlledPasswordField
                name="password"
                control={form.control}
                textFieldProps={{
                    placeholder: "Password",
                    autoComplete: "off",
                    sx: {
                        pt: "2em",
                    },
                }}
            />
            <ControlledPasswordField
                name="passwordConfirmation"
                control={form.control}
                textFieldProps={{
                    placeholder: "Confirm Password",
                    autoComplete: "off",
                    sx: {
                        pt: "2em",
                    },
                }}
            />
            {APP_ENV !== "dev" && (
                <ReCAPTCHA
                    sitekey={RE_CAPTCHA_SECRET ?? ""}
                    onChange={(token) => {
                        form.setValue("reCaptchaToken", token ?? "");
                    }}
                />
            )}
            <SubmitButton
                label="Register"
                type="submit"
                className={submitStyle}
                isSubmitting={form.formState.isSubmitting}
            />
        </form>
    );
}
