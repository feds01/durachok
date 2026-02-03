import GamePassphraseCard from "./GamePassphraseCard";
import { useEffect, useState } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";

import { isDef } from "@/utils";
import { cn } from "@/lib/utils";

interface Props<T extends FieldValues> {
    pin: string;
    control: Control<T>;
    name: Path<T>;
}

export default function GamePassphraseInput<T extends FieldValues>({ pin, name, control }: Props<T>) {
    const symbols = ["♡", "♢", "♣", "♤"] as const;
    const [order, setOrder] = useState("");
    const {
        field: { onChange },
        fieldState: { isDirty, error },
        formState: { isSubmitting },
    } = useController({ name, control });

    useEffect(() => {
        if (order.length === 4) {
            onChange(order);
        }
    }, [order, onChange]);

    return (
        <div>
            <div>
                <p className="font-sans text-3xl">
                    Passphrase for <code className="tracking-wide">{pin}</code>
                </p>
                <div className={cn("flex flex-row justify-center flex-nowrap", isDef(error) && "animate-shake")}>
                    {symbols.map((symbol) => (
                        <GamePassphraseCard
                            key={symbol}
                            symbol={symbol}
                            selected={order.indexOf(symbol) !== -1}
                            onClick={() => setOrder(order + symbol)}
                        />
                    ))}
                </div>
            </div>
            <div>
                {!isSubmitting && !isDirty && error && <p className="text-destructive">{error.message?.toString()}</p>}
            </div>
        </div>
    );
}
