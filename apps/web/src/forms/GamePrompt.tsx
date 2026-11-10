import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import GamePassphraseInput from "@/components/GamePassphraseInput";
import PinInput from "@/components/PinInput";
import SubmitButton from "@/components/SubmitButton";
import { Input } from "@/components/ui/input";
import { sessionFor, useAuth } from "@/contexts/auth";
import { fadeUp } from "@/lib/motion";
import { PANEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { expr, isDef } from "@/utils";
import trpc, { trpcNativeClient } from "@/utils/trpc";
import { GamePassPhraseSchema, GamePinSchema } from "@/validators/lobby";
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

/** The heading for each step of joining. */
const STAGE_TITLES: Record<StageKind["kind"], string> = {
    pin: "Join a lobby",
    name: "Choose a name",
    security: "Passphrase",
};

export default function GamePrompt({ startPin, onSuccess }: Props) {
    const [stage, setStage] = useState<StageKind>({ kind: "pin" });
    const [auth, updateAuth] = useAuth();

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
                    const session = sessionFor(auth, pin);
                    if (session) {
                        const isMember = await trpcNativeClient.lobbies.get.query({ pin }).then(
                            () => true,
                            () => false,
                        );

                        if (isMember) {
                            onSuccess({ pin, name: session.user.name });
                            return;
                        }

                        // A seat that the lobby no longer has, e.g. one given up on disconnecting,
                        // goes, so that joining again gets a new one.
                        if (session.user.kind === "anonymous") {
                            updateAuth({ type: "leave", pin });
                        }
                    }

                    if (!info.joinable) {
                        form.setError("pin", {
                            type: "manual",
                            message: "This lobby is full, or its game has started.",
                        });
                    } else if (auth.account) {
                        // Registered users play under their account's name.
                        form.setValue("name", auth.account.user.name);

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
        [auth, updateAuth, form, onSubmit, onSuccess, stage],
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
            className={cn(PANEL, "flex w-full flex-col gap-5 text-center")}
            // Each submission moves on a stage, and only the last stage joins the lobby.
            onSubmit={(event) => {
                event.preventDefault();
                void next();
            }}
        >
            <h2 className="m-0 text-2xl">{STAGE_TITLES[stage.kind]}</h2>
            {stage.kind === "pin" && (
                <div className="flex flex-col items-center gap-2">
                    <PinInput
                        value={pinField.field.value}
                        onChange={pinField.field.onChange}
                        // The lobby is looked up as soon as the pin is complete.
                        onComplete={() => void next()}
                        invalid={isDef(pinField.fieldState.error)}
                    />
                    {pinField.fieldState.error && (
                        <p className="m-0 text-sm text-destructive">{pinField.fieldState.error.message}</p>
                    )}
                </div>
            )}
            {stage.kind === "name" && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
                    <Input
                        {...nameField.field}
                        placeholder="Your name"
                        autoComplete="off"
                        maxLength={39}
                        className="h-16 text-center text-3xl md:text-3xl"
                    />
                    {nameField.fieldState.error && (
                        <p className="m-0 text-sm text-destructive">{nameField.fieldState.error.message}</p>
                    )}
                </motion.div>
            )}
            {stage.kind === "security" && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible">
                    <GamePassphraseInput
                        pin={form.getValues().pin}
                        control={form.control}
                        name="security"
                        // The passphrase changes often, so the join goes as soon as it is picked.
                        onComplete={() => void next()}
                    />
                </motion.div>
            )}
            <SubmitButton
                disabled={!isDef(form.formState.dirtyFields[stage.kind])}
                isSubmitting={form.formState.isSubmitting}
                className="h-16 text-2xl"
            />
        </form>
    );
}
