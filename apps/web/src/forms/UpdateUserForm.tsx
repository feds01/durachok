import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { AlertKind } from "@/components/Alert";
import ControlledPasswordField from "@/components/ControlledPasswordField";
import ControlledTextField from "@/components/ControlledTextField";
import FieldLabel from "@/components/FieldLabel";
import SubmitButton from "@/components/SubmitButton";
import { RegisteredUser, useAuthDispatch } from "@/contexts/auth";
import trpc from "@/utils/trpc";
import { UserUpdate, UserUpdateSchema } from "@/valdiators/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { TRPCClientError } from "@trpc/client";

type UpdateUserFormProps = {
    user: RegisteredUser;
    onResponse?: (severity: AlertKind, message: string) => void;
};

const UpdateUserForm = ({ user, onResponse }: UpdateUserFormProps) => {
    const dispatchAuth = useAuthDispatch();
    const updateWith = trpc.users.update.useMutation();
    const form = useForm<UserUpdate>({
        resolver: zodResolver(UserUpdateSchema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: {
            name: user.name,
            email: user.email,
        },
    });

    const onSubmit = async (update: UserUpdate) => {
        try {
            await updateWith.mutateAsync(update);

            if (onResponse) {
                onResponse("success", "User updated.");
            }

            delete update.password;
            dispatchAuth({ type: "update", payload: { ...user, ...update } });
        } catch (e: unknown) {
            if (e instanceof TRPCClientError) {
                console.log(e);
            }
            if (onResponse) {
                onResponse("error", "Could not update user.");
            }
        }
    };

    useEffect(() => {
        form.reset({ name: user.name, email: user.email });
    }, [user, form]);

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
            <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                    <FieldLabel label="Name" />
                    <ControlledTextField name="name" control={form.control} />
                </div>
                <div className="space-y-2">
                    <FieldLabel label="Email" />
                    <ControlledTextField name="email" control={form.control} />
                </div>
                <div className="space-y-2">
                    <FieldLabel label="Password" />
                    <ControlledPasswordField name="password" control={form.control} />
                </div>
                <SubmitButton label="Update" isSubmitting={form.formState.isSubmitting} />
            </div>
        </form>
    );
};

export default UpdateUserForm;
