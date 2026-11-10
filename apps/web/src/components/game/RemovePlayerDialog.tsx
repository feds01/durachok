import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type Props = {
    /** The player whom the owner asked to remove, or null while the dialog is closed. */
    player: string | null;
    onConfirm: (player: string) => void;
    onClose: () => void;
};

/**
 * Asks the lobby's owner to confirm that they remove a player from the game in progress, which
 * ends that player's game: their cards leave play, and they can't join the lobby again.
 */
export default function RemovePlayerDialog({ player, onConfirm, onClose }: Props) {
    return (
        <Dialog open={player !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Remove {player} from the game?</DialogTitle>
                    <DialogDescription>
                        Their cards leave play, the game goes on without them, and they can't join this lobby again.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Keep them
                    </Button>
                    <Button variant="destructive" onClick={() => player !== null && onConfirm(player)}>
                        Remove them
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
