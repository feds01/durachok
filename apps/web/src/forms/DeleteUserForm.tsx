import { AlertKind } from "@/components/Alert";
import { useAuthDispatch } from "@/contexts/auth";
import trpc from "@/utils/trpc";
import Button from "@mui/material/Button";
import { useNavigate } from "@tanstack/react-router";

type DeleteUserFormProps = {
    /** Used to determine what happens in the event of a failure. */
    onResponse?: (severity: AlertKind, message: string) => void;
};

const DeleteUserForm = ({ onResponse }: DeleteUserFormProps) => {
    const deleteUser = trpc.users.delete.useMutation();
    const dispatch = useAuthDispatch();
    const navigator = useNavigate();

    const handleDelete = async () => {
        try {
            await deleteUser.mutateAsync();
            dispatch({ type: "logout" });
            navigator({ to: "/" });
        } catch (_e: unknown) {
            if (onResponse) {
                onResponse("error", "Could not delete user.");
            }
        }
    };

    return (
        <Button
            fullWidth={false}
            color={"error"}
            onClick={handleDelete}
            variant={"contained"}
        >
            Delete
        </Button>
    );
};

export default DeleteUserForm;
