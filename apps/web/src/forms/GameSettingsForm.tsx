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
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <ControlledSliderInput
                name="roundTimeout"
                control={form.control}
                legend="Round time"
                format={(seconds) => `${seconds}s`}
                min={100}
                max={600}
                step={50}
                marks={TIMEOUT_MARKS}
            />
            <ControlledSliderInput
                name="maxPlayers"
                control={form.control}
                legend="Players"
                format={(players) => `Up to ${players}`}
                min={2}
                max={8}
                marks={PLAYERS_MARKS}
            />
            <ControlledSwitchInput
                name="passphrase"
                control={form.control}
                legend="Passphrase"
                label="Players need the passphrase that you see to join."
            />
            <ControlledSwitchInput
                name="randomisePlayerOrder"
                control={form.control}
                legend="Random seats"
                label="Seat the players in a random order."
            />
            <ControlledSwitchInput
                name="shortGameDeck"
                control={form.control}
                legend="Short deck"
                label="Play with 36 cards, for up to 6 players."
            />
            <ControlledSwitchInput
                name="freeForAll"
                control={form.control}
                legend="Free for all"
                label="Anyone can attack after the first card."
            />
            <ControlledSwitchInput
                name="mythicMode"
                control={form.control}
                legend="Mythic mode"
                label="Nobody is told how many cards are left, discarded or in another hand. Keep count yourself."
            />
            <ControlledSwitchInput
                name="allowSpectators"
                control={form.control}
                legend="Spectators"
                label="Anyone with the pin, and the passphrase if there is one, can watch the game, though not the cards in anyone's hand."
            />
            <ControlledSwitchInput
                name="disableChat"
                control={form.control}
                legend="No chat"
                label="Turn the lobby's chat off."
            />
            <SubmitButton
                className="mt-2 h-11 text-base"
                label={submitLabel}
                isSubmitting={form.formState.isSubmitting}
            />
        </form>
    );
}
