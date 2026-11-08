import { PASSPHRASE_LENGTH } from "@durachok/transport";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isDef } from "@/utils";

/** The suits that make up a passphrase, and what to call them. */
const SUITS = { "♡": "hearts", "♢": "diamonds", "♣": "clubs", "♤": "spades" } as const;

type Suit = keyof typeof SUITS;

interface Props<T extends FieldValues> {
    pin: string;
    control: Control<T>;
    name: Path<T>;
    /** Called once all four suits are picked. */
    onComplete?: () => void;
}

/** The passphrase, picked as the four suits in the order that the lobby's owner sees them. */
export default function GamePassphraseInput<T extends FieldValues>({ pin, name, control, onComplete }: Props<T>) {
    const [order, setOrder] = useState<Suit[]>([]);
    const {
        field: { onChange },
        fieldState: { error },
    } = useController({ name, control });
    const suits = Object.keys(SUITS) as Suit[];

    // A wrong passphrase starts the picking again, since the owner's has likely changed.
    const [lastError, setLastError] = useState(error);
    if (error !== lastError) {
        setLastError(error);
        if (isDef(error)) {
            setOrder([]);
        }
    }

    const pick = (suit: Suit) => {
        const picked = [...order, suit];
        setOrder(picked);

        if (picked.length === PASSPHRASE_LENGTH) {
            onChange(picked.join(""));
            onComplete?.();
        }
    };

    return (
        <div className="flex flex-col items-center gap-5">
            <p className="m-0 text-muted-foreground">
                Pick the suits in the order that the owner of{" "}
                <span className="font-display font-black italic lining-nums text-foreground">{pin}</span> sees them.
            </p>
            <div className={cn("flex gap-2", isDef(error) && "animate-shake")} aria-label="Your passphrase">
                {Array.from({ length: PASSPHRASE_LENGTH }, (_, index) => {
                    const symbol = order[index];
                    return (
                        <div
                            // eslint-disable-next-line react/no-array-index-key -- each slot is a fixed position
                            key={index}
                            className={cn(
                                "flex h-16 w-12 items-center justify-center rounded-lg border-2 text-3xl",
                                symbol
                                    ? "border-primary text-primary"
                                    : "border-dashed border-border text-sm text-muted-foreground/40",
                            )}
                        >
                            {symbol ?? index + 1}
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center gap-3">
                {/* A suit can come up more than once, so each stays to be picked again. */}
                {suits.map((suit) => (
                    <motion.button
                        type="button"
                        key={suit}
                        onClick={() => pick(suit)}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={`Pick ${SUITS[suit]}`}
                        className="flex h-20 w-16 cursor-pointer select-none items-center justify-center rounded-lg border-2 border-primary bg-card text-5xl text-primary shadow-md max-sm:h-16 max-sm:w-12 max-sm:text-4xl"
                    >
                        {suit}
                    </motion.button>
                ))}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setOrder([])}
                    disabled={order.length === 0}
                    aria-label="Start again"
                    title="Start again"
                >
                    <RotateCcw />
                </Button>
            </div>
            {error && <p className="m-0 text-sm text-destructive">{error.message?.toString()}</p>}
        </div>
    );
}
