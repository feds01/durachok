import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@mui/material";
import { TRPCClientError } from "@trpc/client";
import { Buffer } from "buffer";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AlertKind } from "../components/Alert";
import { trpc } from "../utils/trpc";

type Props = {
    /** Used to determine what happens in the event of a failure. */
    onResponse?: (severity: AlertKind, message: string) => void;
};

const UserProfileImageUpdateSchema = z.object({
    image: z.instanceof(Buffer),
});

export type UserProfileImageUpdate = z.infer<
    typeof UserProfileImageUpdateSchema
>;

export default function UpdateUserProfileImageForm({ onResponse }: Props) {
    const updateWith = trpc.users.update.useMutation();
    const form = useForm<UserProfileImageUpdate>({
        resolver: zodResolver(UserProfileImageUpdateSchema),
        mode: "onSubmit",
        reValidateMode: "onChange",
    });

    const onSubmit = async (update: UserProfileImageUpdate) => {
        try {
            await updateWith.mutateAsync(update);

            if (onResponse) {
                onResponse("success", "User image updated.");
            }
        } catch (e: unknown) {
            if (e instanceof TRPCClientError) {
                console.log(e);
            }
            if (onResponse) {
                onResponse("error", "Failed to update user image.");
            }
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div>
                <input
                    accept="image/jpeg"
                    type="file"
                    id="upload-profile"
                    style={{ display: "none" }}
                    {...form.register("image")}
                    onChange={async (e) => {
                        const file = e.target.files![0];
                        const buf = await file.arrayBuffer();
                        form.setValue("image", Buffer.from(buf));
                        form.handleSubmit(onSubmit)();
                    }}
                />
                {form.formState.errors.image && (
                    <div>{form.formState.errors.image.message}</div>
                )}

                <label htmlFor="upload-profile">
                    <Button
                        variant="contained"
                        color="primary"
                        component="span"
                        sx={{ mt: 1 }}
                    >
                        Upload
                    </Button>
                </label>
            </div>
        </form>
    );
}
