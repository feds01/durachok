import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLobbyStore } from "@/contexts/lobby";
import GameSettingsForm from "@/forms/GameSettingsForm";
import { Lobby } from "@durachok/transport";

type Props = {
    lobby: Lobby;
    open: boolean;
    onClose: () => void;
};

/** The owner changes the lobby's settings here, before the game starts. */
export default function LobbySettingsDialog({ lobby, open, onClose }: Props) {
    const updateSettings = useLobbyStore((state) => state.updateSettings);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-foreground">Lobby settings</DialogTitle>
                </DialogHeader>
                {/* The server sends the room the new settings, or the owner an error. */}
                <GameSettingsForm
                    defaultValues={{
                        maxPlayers: lobby.maxPlayers,
                        roundTimeout: lobby.roundTimeout,
                        passphrase: lobby.hasPassphrase,
                        randomisePlayerOrder: lobby.randomisePlayerOrder,
                        shortGameDeck: lobby.shortGameDeck,
                        freeForAll: lobby.freeForAll,
                        disableChat: lobby.disableChat,
                    }}
                    submitLabel="Save"
                    onSubmit={(settings) => {
                        updateSettings(settings);
                        onClose();
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}
