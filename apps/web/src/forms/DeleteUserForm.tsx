import { AlertKind } from "@/components/Alert";
import { Button } from "@/components/ui/button";
import { useAuthDispatch } from "@/contexts/auth";
import trpc from "@/utils/trpc";
import { useNavigate } from "@tanstack/react-router";

type DeleteUserFormProps = {
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
        } catch {
            if (onResponse) {
                onResponse("error", "Could not delete user.");
            }
        }
    };

    return (
        <Button variant="destructive" onClick={handleDelete}>
            Delete
        </Button>
    );
};

export default DeleteUserForm;
