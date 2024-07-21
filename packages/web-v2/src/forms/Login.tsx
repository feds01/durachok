import { css } from "@emotion/css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import ControlledPasswordField from "../components/ControlledPasswordField";
import ControlledTextField from "../components/ControlledTextField";
import SubmitButton from "../components/SubmitButton";
import { expr } from "../utils";
import { trpc } from "../utils/trpc";
import { UserEmailSchema } from "../valdiators/user";

const LoginSchema = z.object({
    credential: z.string(),
    password: z.string().min(8),
});

export type Login = z.infer<typeof LoginSchema>;
export type LoginResult = {
    id: string;
    name: string;
    email: string;
    token: string;
    refreshToken: string;
};

type Props = {
    onSuccess: (result: LoginResult) => void;
};

const submitStyle = css`
    height: 60px;
    font-size: 2em !important;
    background-color: #3f51b5 !important;
    margintop: 19px;

    &:hover {
        background-color: #3f51b5 !important;
    }
`;

export default function Login({ onSuccess }: Props) {
    const loginWith = trpc.auth.login.useMutation();
    const form = useForm<Login>({
        resolver: zodResolver(LoginSchema),
        reValidateMode: "onSubmit",
        defaultValues: {
            credential: "",
            password: "",
        },
    });

    const onSubmit = async (login: Login) => {
        try {
            const credentials = expr(() => {
                const maybeEmail = UserEmailSchema.safeParse(login.credential);
                if (maybeEmail.success) {
                    return { email: login.credential };
                } else {
                    return { name: login.credential };
                }
            });

            const result = await loginWith.mutateAsync({
                ...credentials,
                password: login.password,
            });
            await onSuccess(result);
        } catch (e: unknown) {
            if (e instanceof Error) {
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
                name="credential"
                control={form.control}
                textFieldProps={{
                    placeholder: "Username or Email",
                    autoFocus: true,
                    autoComplete: "off",
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
            <SubmitButton
                label="Login"
                type="submit"
                className={submitStyle}
                isSubmitting={form.formState.isSubmitting}
            />
        </form>
    );
}
