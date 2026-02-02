import GamePassphraseCard from "./GamePassphraseCard";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";

import { isDef } from "@/utils";
import { css, keyframes } from "@emotion/css";

const shake = keyframes`
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }

  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }

  30%, 50%, 70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%, 60% {
    transform: translate3d(4px, 0, 0);
  }
`;

const label = css`
    font-family: "Noto Sans", sans-serif;
    font-size: 32px;
    
    code {
        letter-spacing: 1px;
    }
`;

const selector = css`
    display: flex;
    flex-direction: row;
    justify-content: center;
    flex-wrap: nowrap;
`;

const incorrect = css`
    animation: ${shake} 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    perspective: 1000px;
`;

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
                <p className={label}>
                    Passphrase for <code>{pin}</code>
                </p>
                <div className={clsx(selector, { [incorrect]: isDef(error) })}>
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
            <div>{!isSubmitting && !isDirty && error && <p>{error.message?.toString()}</p>}</div>
        </div>
    );
}
