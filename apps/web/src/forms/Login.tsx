import { useForm } from "react-hook-form";

import ControlledPasswordField from "@/components/ControlledPasswordField";
import ControlledTextField from "@/components/ControlledTextField";
import SubmitButton from "@/components/SubmitButton";
import { AuthResult, LoginFormData, LoginFormSchema } from "@/types/auth";
import { expr } from "@/utils";
import trpc from "@/utils/trpc";
import { UserEmailSchema } from "@durachok/transport";
import { zodResolver } from "@hookform/resolvers/zod";

type Props = {
    onSuccess: (result: AuthResult) => void;
};

export default function Login({ onSuccess }: Props) {
    const loginWith = trpc.auth.login.useMutation();
    const form = useForm<LoginFormData>({
        resolver: zodResolver(LoginFormSchema),
        reValidateMode: "onSubmit",
        defaultValues: {
            credential: "",
            password: "",
        },
    });

    const onSubmit = async (login: LoginFormData) => {
        try {
            const credentials = expr(() => {
                const maybeEmail = UserEmailSchema.safeParse(login.credential);
                if (maybeEmail.success) {
                    return { email: login.credential };
                }

                return { name: login.credential };
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
        <form className="grow flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <ControlledTextField name="credential" control={form.control} placeholder="Username or Email" />
            <ControlledPasswordField name="password" control={form.control} placeholder="Password" />
            <SubmitButton label="Login" className="h-15 text-2xl mt-4" isSubmitting={form.formState.isSubmitting} />
        </form>
    );
}
