import { css } from "@emotion/css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import ControlledTextField from "../components/ControlledTextField";
import GamePassphraseInput from "../components/GamePassphraseInput";
import SubmitButton from "../components/SubmitButton";
import { isDef } from "../utils";
import { GamePassPhraseSchema, GamePinSchema } from "../valdiators/lobby";
import { UserNameSchema } from "../valdiators/user";

type Props = {
    startPin?: string;
};

type StageKind = "pin" | "name" | "security";

const GamePromptFormInputSchema = z.object({
    pin: GamePinSchema,
    name: UserNameSchema,
    security: GamePassPhraseSchema.optional(),
});

type GamePromptInput = z.infer<typeof GamePromptFormInputSchema>;

export default function GamePrompt({ startPin }: Props) {
    const [stage, setStage] = useState<StageKind>("pin");
    const navigator = useNavigate();

    const form = useForm<GamePromptInput>({
        resolver: zodResolver(GamePromptFormInputSchema),
        reValidateMode: "onBlur",
        defaultValues: {
            pin: startPin ?? "",
            security: "",
            name: "",
        },
    });

    const onSubmit = (data: GamePromptInput) => {
        if (isDef(data.pin)) {
            navigator({
                to: `/lobby/$id`,
                params: { id: data.pin.toString() },
            });
        }
    };

    const next = async () => {
        // We always enter the name after the `pin` stage.
        if (stage === "pin") {
            const result = await form.trigger("pin", { shouldFocus: true });

            if (result) {
                setStage("name");
            }

            // We need to pre-fetch info about the lobby to determine
            // whether we will need to enter the security code.
        } else if (stage === "name") {
            const result = await form.trigger("name", { shouldFocus: true });
            if (!result) {
                return;
            }

            // TODO: test whether we need a security code...
            const always = () => true;

            if (always()) {
                setStage("security");
            } else {
                await form.handleSubmit(onSubmit)();
            }
        } else if (stage === "security") {
            await form.handleSubmit(onSubmit)();
        }
    };

    return (
        <form
            className={css`
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                margin: 0 auto;
                max-width: 400px;
            `}
            onSubmit={form.handleSubmit(onSubmit)}
        >
            {stage === "pin" && (
                <ControlledTextField
                    name="pin"
                    control={form.control}
                    textFieldProps={{
                        placeholder: "Game PIN",
                        autoFocus: true,
                        autoComplete: "off",
                        sx: {
                            pt: "4em",
                        },
                        inputProps: {
                            maxLength: 6,
                            style: {
                                textAlign: "center",
                                fontSize: "2em",
                            },
                        },
                    }}
                />
            )}
            {stage === "name" && (
                <motion.div
                    transition={{ duration: 0.3 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <ControlledTextField
                        name="name"
                        control={form.control}
                        textFieldProps={{
                            placeholder: "Name",
                            autoFocus: true,
                            autoComplete: "off",
                            sx: {
                                pt: "4em",
                            },
                            inputProps: {
                                maxLength: 39,
                                style: {
                                    textAlign: "center",
                                    width: "400px",
                                    fontSize: "2em",
                                },
                            },
                        }}
                    />
                </motion.div>
            )}
            {stage === "security" && (
                <motion.div
                    transition={{ duration: 0.3 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <GamePassphraseInput
                        pin={form.getValues().pin}
                        control={form.control}
                        name="security"
                    />
                </motion.div>
            )}
            <SubmitButton
                disabled={!isDef(form.formState.dirtyFields[stage])}
                isSubmitting={form.formState.isSubmitting}
                onClick={next}
            />
        </form>
    );
}
