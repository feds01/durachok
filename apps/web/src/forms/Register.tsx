import { ReCAPTCHA } from "react-google-recaptcha";
import { useForm } from "react-hook-form";

import ControlledPasswordField from "@/components/ControlledPasswordField";
import ControlledTextField from "@/components/ControlledTextField";
import SubmitButton from "@/components/SubmitButton";
import { APP_ENV, RE_CAPTCHA_SECRET } from "@/config";
import { AuthResult, RegisterFormData, RegisterFormSchema } from "@/types/auth";
import trpc from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";

type Props = {
    onSuccess: (result: AuthResult) => void;
};

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
                form.setError("password", {
                    type: "manual",
                    message: e.message,
                });
            }
        }
    };

    return (
        <form className="grow flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <ControlledTextField name="name" control={form.control} placeholder="Username" />
            <ControlledTextField name="email" control={form.control} placeholder="Email" />
            <ControlledPasswordField name="password" control={form.control} placeholder="Password" />
            <ControlledPasswordField
                name="passwordConfirmation"
                control={form.control}
                placeholder="Confirm Password"
            />
            {APP_ENV !== "dev" && (
                <ReCAPTCHA
                    sitekey={RE_CAPTCHA_SECRET ?? ""}
                    onChange={(token) => {
                        form.setValue("reCaptchaToken", token ?? "");
                    }}
                />
            )}
            <SubmitButton label="Register" className="h-15 text-2xl mt-4" isSubmitting={form.formState.isSubmitting} />
        </form>
    );
}
