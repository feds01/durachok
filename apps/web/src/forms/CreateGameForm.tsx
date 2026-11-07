import GameSettingsForm, { GameSettingsFormData } from "@/forms/GameSettingsForm";
import trpc from "@/utils/trpc";

type CreateGameFormProps = {
    /** Called with the new lobby's pin. */
    onSuccess: (pin: string) => void;
};

/** The settings that a new lobby starts with. */
const DEFAULT_SETTINGS: GameSettingsFormData = {
    maxPlayers: 4,
    roundTimeout: 300,
    passphrase: false,
    randomisePlayerOrder: true,
    shortGameDeck: false,
    freeForAll: true,
    disableChat: false,
    mythicMode: false,
};

export default function CreateGameForm({ onSuccess }: CreateGameFormProps) {
    const utils = trpc.useUtils();
    // The new lobby joins the user's lobbies on the dashboard.
    const createGame = trpc.lobbies.create.useMutation({ onSuccess: () => utils.users.get.invalidate() });

    return (
        <GameSettingsForm
            defaultValues={DEFAULT_SETTINGS}
            submitLabel="Create"
            onSubmit={async (settings) => {
                const { pin } = await createGame.mutateAsync({ settings });
                onSuccess(pin);
            }}
        />
    );
}
