import {
    GameSettings,
    GameSettingsSchema,
} from "@durachok/transport/src/request";
import { css } from "@emotion/css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import ControlledSliderInput from "../components/ControlledSliderField";
import ControlledSwitchInput from "../components/ControlledSwitchField";
import SubmitButton from "../components/SubmitButton";
import trpc from "../utils/trpc";

type CreateGameFormProps = {
    onSuccess: () => void;
};

export default function CreateGameForm({ onSuccess }: CreateGameFormProps) {
    const createGame = trpc.lobbies.create.useMutation();
    const form = useForm<GameSettings>({
        resolver: zodResolver(GameSettingsSchema),
        mode: "onChange",
        reValidateMode: "onChange",
        defaultValues: {
            maxPlayers: 4,
            roundTimeout: 300,
            passphrase: false,
            randomPlayerOrder: true,
            shortGameDeck: false,
            freeForAll: true,
            disableChat: false,
        },
    });

    const onSubmit = async (formData: GameSettings) => {
        try {
            await createGame.mutateAsync({ settings: formData });
            onSuccess();
        } catch (e: unknown) {
            if (e instanceof Error) {
                form.setError("maxPlayers", {
                    type: "manual",
                    message: e.message,
                });
            }
        }
    };

    return (
        <form
            className={css`
                flex-grow: 1;
                display: flex;
                flex-direction: column;
            `}
            onSubmit={form.handleSubmit(onSubmit)}
        >
            <ControlledSliderInput
                name="roundTimeout"
                control={form.control}
                legend="Round Timeout (seconds)"
                min={100}
                max={600}
                step={50}
                marks={[
                    { value: 100, label: "100" },
                    { value: 600, label: "600" },
                ]}
                valueLabelDisplay="auto"
            />
            <ControlledSliderInput
                name="maxPlayers"
                control={form.control}
                legend="Max Players"
                min={2}
                max={8}
                marks={[
                    { value: 2, label: "2" },
                    { value: 8, label: "8" },
                ]}
                valueLabelDisplay="auto"
            />
            <ControlledSwitchInput
                name="passphrase"
                control={form.control}
                legend="Use passphrase"
                label="Enable passphrase step for joining players."
            />
            <ControlledSwitchInput
                name="randomPlayerOrder"
                control={form.control}
                legend="Random player order"
                label="Randomise the player starting order."
            />
            <ControlledSwitchInput
                name="shortGameDeck"
                control={form.control}
                legend="Short game deck"
                label="Use a shorter game deck for the game (36 cards)"
            />
            <ControlledSwitchInput
                name="freeForAll"
                control={form.control}
                legend="Free for all"
                label="Allow users to play in any order after the first turn."
            />
            <ControlledSwitchInput
                name="disableChat"
                control={form.control}
                legend="Disable chat"
                label="Disable the chat in the game."
            />
            <SubmitButton
                sx={{ mt: "1em" }}
                type="submit"
                label={"Create"}
                isSubmitting={form.formState.isSubmitting}
            />
        </form>
    );
}
