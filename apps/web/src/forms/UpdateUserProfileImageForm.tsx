import { Buffer } from "buffer";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AlertKind } from "@/components/Alert";
import { Button } from "@/components/ui/button";
import trpc from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { TRPCClientError } from "@trpc/client";

type Props = {
    onResponse?: (severity: AlertKind, message: string) => void;
};

const UserProfileImageUpdateSchema = z.object({
    image: z.instanceof(Buffer),
});

export type UserProfileImageUpdate = z.infer<typeof UserProfileImageUpdateSchema>;

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
                    className="hidden"
                    {...form.register("image")}
                    onChange={async (e) => {
                        const file = e.target.files![0];
                        const buf = await file.arrayBuffer();
                        form.setValue("image", Buffer.from(buf));
                        form.handleSubmit(onSubmit)();
                    }}
                />
                {form.formState.errors.image && (
                    <div className="text-sm text-destructive">{form.formState.errors.image.message}</div>
                )}

                <Button type="button" className="mt-2" asChild>
                    <label htmlFor="upload-profile" className="cursor-pointer">
                        Upload
                    </label>
                </Button>
            </div>
        </form>
    );
}
