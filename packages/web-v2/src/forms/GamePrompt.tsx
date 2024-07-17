import { z } from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { isDef } from "../utils";
import ControlledTextField from "../components/ControlledTextField";
import { css } from "@emotion/css";
import SubmitButton from "../components/SubmitButton";

type Props = {
    startPin?: string;
};

type StageKind = "pin" | "name" | "security";

const GamePromptFormInputSchema = z.object({
    pin: z.string().regex(/^\d{6}$/, "Game PIN is 6 digits long."),
    name: z.string(),
    security: z.string().optional(),
});

type GamePromptInput = z.infer<typeof GamePromptFormInputSchema>;

export default function GamePrompt({ startPin }: Props) {
    const [stage] = useState<StageKind>("pin");
    const navigator = useNavigate();

    const form = useForm<GamePromptInput>({
        resolver: zodResolver(GamePromptFormInputSchema),
        defaultValues: {
            pin: startPin ?? "",
            security: "",
            name: "",
        },
    });

    const onSubmit = (data: GamePromptInput) => {
        console.log(data);

        if (isDef(data.pin)) {
            navigator({
                to: `/lobby/$id`,
                params: { id: data.pin.toString() },
            });
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
                        inputProps: {
                          maxLength: 6,
                          style: {
                            textAlign: "center",
                            fontSize: "2em",
                          }
                        }
                    }}
                />
            )}
            {
              stage === "name" && (
                <ControlledTextField
                    name="name"
                    control={form.control}
                    textFieldProps={{
                        label: "Name",
                        autoFocus: true,
                    }}
                />
              )
            }
            <SubmitButton isSubmitting={form.formState.isSubmitting} />
        </form>
    );
}
