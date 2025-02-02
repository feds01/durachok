import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import ControlledTextField from "@/components/ControlledTextField";
import GamePassphraseInput from "@/components/GamePassphraseInput";
import SubmitButton from "@/components/SubmitButton";
import { expr, isDef } from "@/utils";
import trpc, { trpcNativeClient } from "@/utils/trpc";
import { GamePassPhraseSchema, GamePinSchema } from "@/valdiators/lobby";
import { LobbyInfo } from "@durachok/transport";
import { UserNameSchema } from "@durachok/transport";
import { css } from "@emotion/css";
import { zodResolver } from "@hookform/resolvers/zod";

export type LobbyAuthInfo = {
    pin: string;
    tokens?: {
        token: string;
        refreshToken: string;
    };
};

type Props = {
    startPin?: string;
    onSuccess: (data: LobbyAuthInfo) => void;
};

type StageKind =
    | {
          kind: "pin";
      }
    | { kind: "name" | "security"; info: LobbyInfo };

const GamePromptFormInputSchema = z.object({
    pin: GamePinSchema,
    name: UserNameSchema,
    security: GamePassPhraseSchema.optional(),
});

type GamePromptInput = z.infer<typeof GamePromptFormInputSchema>;

const submitStyle = css`
    height: 60px;
    font-size: 2em !important;
    background-color: #3f51b5 !important;
    margin-top: 19px !important;

    &:hover {
        background-color: #3f51b5 !important;
    }
`;

export default function GamePrompt({ startPin, onSuccess }: Props) {
    const [stage, setStage] = useState<StageKind>({ kind: "pin" });

    const joinLobbyMutation = trpc.lobbies.join.useMutation();

    const form = useForm<GamePromptInput>({
        resolver: zodResolver(GamePromptFormInputSchema),
        reValidateMode: "onBlur",
        defaultValues: {
            pin: startPin ?? "",
            name: "",
        },
    });

    const onSubmit = async (info: GamePromptInput) => {
        try {
            const { token, refreshToken } =
                await joinLobbyMutation.mutateAsync(info);

            const tokens = expr(() => {
                if (isDef(token) && isDef(refreshToken)) {
                    return { token, refreshToken };
                } else {
                    return;
                }
            });

            onSuccess({ pin: info.pin, ...(tokens && { tokens }) });
        } catch (e: unknown) {
            // @@Todo: handle errors better.
            if (e instanceof Error) {
                form.setError(stage.kind, {
                    type: "manual",
                    message: e.message,
                });
            }
        }
    };

    const next = async () => {
        // We always enter the name after the `pin` stage.
        if (stage.kind === "pin") {
            const result = await form.trigger("pin", { shouldFocus: true });
            if (!result) {
                return;
            }

            const info = await expr(async () => {
                try {
                    return await trpcNativeClient.lobbies.getInfo.query({
                        pin: form.getValues().pin,
                    });
                } catch (e: unknown) {
                    // @@Todo: handle errors better.
                    if (e instanceof Error) {
                        form.setError(stage.kind, {
                            type: "manual",
                            message: e.message,
                        });
                    }
                    return;
                }
            });

            if (info) {
                if (info.joinable) {
                    setStage({ kind: "name", info });
                } else {
                    form.setError("pin", {
                        type: "manual",
                        message: "This lobby is not joinable.",
                    });
                }
            } else {
                form.setError("pin", {
                    type: "manual",
                    message: "This lobby does not exist.",
                });
            }
        } else {
            const { kind, info } = stage;
            const { name, pin } = form.getValues();
            const result = await form.trigger(kind, { shouldFocus: true });
            if (!result) {
                return;
            }

            if (kind === "name") {
                const free =
                    await trpcNativeClient.lobbies.nameFreeInLobby.query({
                        pin,
                        name,
                    });

                if (!free) {
                    form.setError("name", {
                        type: "manual",
                        message: "Name is already taken.",
                    });
                    return;
                }

                if (info.passphrase) {
                    setStage({ kind: "security", info });
                } else {
                    await form.handleSubmit(onSubmit)();
                }
            } else {
                await form.handleSubmit(onSubmit)();
            }
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
            {stage.kind === "pin" && (
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
            {stage.kind === "name" && (
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
            {stage.kind === "security" && (
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
                disabled={!isDef(form.formState.dirtyFields[stage.kind])}
                isSubmitting={form.formState.isSubmitting}
                className={submitStyle}
                onClick={next}
            />
        </form>
    );
}
