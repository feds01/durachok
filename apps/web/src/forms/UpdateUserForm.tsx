import { css } from "@emotion/css";
import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import { TRPCClientError } from "@trpc/client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { AlertKind } from "../components/Alert";
import ControlledPasswordField from "../components/ControlledPasswordField";
import ControlledTextField from "../components/ControlledTextField";
import FieldLabel from "../components/FieldLabel";
import SubmitButton from "../components/SubmitButton";
import { RegisteredUser, useAuthDispatch } from "../contexts/auth";
import trpc from "../utils/trpc";
import { UserUpdate, UserUpdateSchema } from "../valdiators/user";

type UpdateUserFormProps = {
    /** The user to update. */
    user: RegisteredUser;
    /** Used to determine what happens in the event of a failure. */
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

            // We want to invalidate the user query so that the user's data is
            // refreshed.
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
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={css`
                width: 100%;
            `}
        >
            <Grid container maxWidth={"md"}>
                <Grid item xs={12} sx={{ pt: 1 }}>
                    <FieldLabel label="Name" />
                    <ControlledTextField name="name" control={form.control} />
                </Grid>
                <Grid item xs={12} sx={{ pt: 1 }}>
                    <FieldLabel label="Email" />
                    <ControlledTextField name="email" control={form.control} />
                </Grid>
                <Grid item xs={12} sx={{ pt: 1 }}>
                    <FieldLabel label="Password" />
                    <ControlledPasswordField
                        name="password"
                        control={form.control}
                    />
                </Grid>
                <Grid item xs={12}>
                    <SubmitButton
                        label="Update"
                        type="submit"
                        isSubmitting={form.formState.isSubmitting}
                    />
                </Grid>
            </Grid>
        </form>
    );
};

export default UpdateUserForm;
