import { useForm } from "react-hook-form";
import { z } from "zod";

import ControlledSliderInput from "@/components/ControlledSliderField";
import ControlledSwitchInput from "@/components/ControlledSwitchField";
import SubmitButton from "@/components/SubmitButton";
import { GameSettingsSchema } from "@durachok/transport";
import { zodResolver } from "@hookform/resolvers/zod";

export type GameSettingsFormData = z.output<typeof GameSettingsSchema>;

type Props = {
    /** The settings that the form starts with. */
    defaultValues: GameSettingsFormData;
    /** The label of the submit button. */
    submitLabel: string;
    /** Save the settings, throwing an error to show under the form. */
    onSubmit: (settings: GameSettingsFormData) => Promise<void> | void;
};

const TIMEOUT_MARKS = [
    { value: 100, label: "100" },
    { value: 600, label: "600" },
];

const PLAYERS_MARKS = [
    { value: 2, label: "2" },
    { value: 8, label: "8" },
];

/** A lobby's settings, for creating a lobby or changing one. */
export default function GameSettingsForm({ defaultValues, submitLabel, onSubmit: save }: Props) {
    const form = useForm({
        resolver: zodResolver(GameSettingsSchema),
        mode: "onChange",
        reValidateMode: "onChange",
        defaultValues,
    });

    const onSubmit = async (formData: GameSettingsFormData) => {
        try {
            await save(formData);
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
        <form className="grow flex flex-col" onSubmit={form.handleSubmit(onSubmit)}>
            <ControlledSliderInput
                name="roundTimeout"
                control={form.control}
                legend="Round Timeout (seconds)"
                min={100}
                max={600}
                step={50}
                marks={TIMEOUT_MARKS}
            />
            <ControlledSliderInput
                name="maxPlayers"
                control={form.control}
                legend="Max Players"
                min={2}
                max={8}
                marks={PLAYERS_MARKS}
            />
            <ControlledSwitchInput
                name="passphrase"
                control={form.control}
                legend="Use passphrase"
                label="Enable passphrase step for joining players."
            />
            <ControlledSwitchInput
                name="randomisePlayerOrder"
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
            <SubmitButton className="mt-4" label={submitLabel} isSubmitting={form.formState.isSubmitting} />
        </form>
    );
}
