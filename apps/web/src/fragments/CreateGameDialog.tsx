import Divider from "@/components/Divider";
import CreateGameForm from "@/forms/CreateGameForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function CreateGameDialog({ open, onClose }: Props) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="bg-background border-border">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-foreground">Create new game</DialogTitle>
                </DialogHeader>
                <Divider />
                <CreateGameForm onSuccess={onClose} />
            </DialogContent>
        </Dialog>
    );
}
