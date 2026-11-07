import Divider from "@/components/Divider";
import CreateGameForm from "@/forms/CreateGameForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "@tanstack/react-router";

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function CreateGameDialog({ open, onClose }: Props) {
    const navigate = useNavigate();

    // The owner goes straight into the lobby that they created.
    const onCreated = (pin: string) => {
        onClose();
        void navigate({ to: "/lobby/$pin", params: { pin } });
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="bg-background border-border">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-foreground">Create new game</DialogTitle>
                </DialogHeader>
                <Divider />
                <CreateGameForm onSuccess={onCreated} />
            </DialogContent>
        </Dialog>
    );
}
