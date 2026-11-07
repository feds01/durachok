import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import GamePassphraseInput from "@/components/GamePassphraseInput";
import SubmitButton from "@/components/SubmitButton";
import { Input } from "@/components/ui/input";
import { useAuthState } from "@/contexts/auth";
import { expr, isDef } from "@/utils";
import trpc, { trpcNativeClient } from "@/utils/trpc";
import { GamePassPhraseSchema, GamePinSchema } from "@/valdiators/lobby";
import { LobbyInfo } from "@durachok/transport";
import { UserNameSchema } from "@durachok/transport";
import { zodResolver } from "@hookform/resolvers/zod";
import { useController } from "react-hook-form";

export type LobbyAuthInfo = {
    pin: string;
    /** The name that the player is in the lobby under. */
    name: string;
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

export default function GamePrompt({ startPin, onSuccess }: Props) {
    const [stage, setStage] = useState<StageKind>({ kind: "pin" });
    const { state: auth } = useAuthState();

    const joinLobbyMutation = trpc.lobbies.join.useMutation();

    const form = useForm<GamePromptInput>({
        resolver: zodResolver(GamePromptFormInputSchema),
        reValidateMode: "onBlur",
        defaultValues: {
            pin: startPin ?? "",
            name: "",
        },
    });

    const pinField = useController({ name: "pin", control: form.control });
    const nameField = useController({ name: "name", control: form.control });

    const onSubmit = useCallback(
        async (info: GamePromptInput) => {
            try {
                const { token, refreshToken } = await joinLobbyMutation.mutateAsync({
                    pin: info.pin,
                    name: info.name,
                    passphrase: info.security,
                });

                const tokens = expr(() => {
                    if (isDef(token) && isDef(refreshToken)) {
                        return { token, refreshToken };
                    }
                });

                onSuccess({ pin: info.pin, name: info.name, ...(tokens && { tokens }) });
            } catch (e: unknown) {
                if (e instanceof Error) {
                    form.setError(stage.kind, {
                        type: "manual",
                        message: e.message,
                    });
                }
            }
        },
        [joinLobbyMutation, onSuccess, form, stage.kind],
    );

    const next = useMemo(
        () => async () => {
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
                    const { pin } = form.getValues();

                    // A player who is already in the lobby, such as its owner, goes straight in.
                    if (auth.kind === "logged-in") {
                        const isMember = await trpcNativeClient.lobbies.get.query({ pin }).then(
                            () => true,
                            () => false,
                        );

                        if (isMember) {
                            onSuccess({ pin, name: auth.user.name });
                            return;
                        }
                    }

                    if (!info.joinable) {
                        form.setError("pin", {
                            type: "manual",
                            message: "This lobby is full, or its game has started.",
                        });
                    } else if (auth.kind === "logged-in" && auth.user.kind === "registered") {
                        // Registered users play under their account's name.
                        form.setValue("name", auth.user.name);

                        if (info.passphrase) {
                            setStage({ kind: "security", info });
                        } else {
                            await form.handleSubmit(onSubmit)();
                        }
                    } else {
                        setStage({ kind: "name", info });
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
                    const free = await trpcNativeClient.lobbies.nameFreeInLobby.query({
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
        },
        [auth, form, onSubmit, onSuccess, stage],
    );

    // A pin from a shared link is checked straight away, once.
    const checkedStartPin = useRef(false);
    useEffect(() => {
        if (isDef(startPin) && !checkedStartPin.current) {
            checkedStartPin.current = true;
            void next();
        }
    }, [startPin, next]);

    return (
        <form
            className="grow flex flex-col mx-auto max-w-100"
            // Each submission moves on a stage, and only the last stage joins the lobby.
            onSubmit={(event) => {
                event.preventDefault();
                void next();
            }}
        >
            {stage.kind === "pin" && (
                <div className="pt-16 space-y-2">
                    <Input
                        {...pinField.field}
                        placeholder="Game PIN"
                        autoComplete="off"
                        maxLength={6}
                        className="text-center text-2xl h-14"
                    />
                    {pinField.fieldState.error && (
                        <p className="text-sm text-destructive text-center">{pinField.fieldState.error.message}</p>
                    )}
                </div>
            )}
            {stage.kind === "name" && (
                <motion.div
                    transition={{ duration: 0.3 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pt-16 space-y-2"
                >
                    <Input
                        {...nameField.field}
                        placeholder="Name"
                        autoComplete="off"
                        maxLength={39}
                        className="text-center text-2xl h-14 w-100"
                    />
                    {nameField.fieldState.error && (
                        <p className="text-sm text-destructive text-center">{nameField.fieldState.error.message}</p>
                    )}
                </motion.div>
            )}
            {stage.kind === "security" && (
                <motion.div
                    transition={{ duration: 0.3 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <GamePassphraseInput pin={form.getValues().pin} control={form.control} name="security" />
                </motion.div>
            )}
            <SubmitButton
                disabled={!isDef(form.formState.dirtyFields[stage.kind])}
                isSubmitting={form.formState.isSubmitting}
                className="h-15 text-2xl mt-4"
            />
        </form>
    );
}
