import { OTPInput, REGEXP_ONLY_DIGITS, SlotProps } from "input-otp";

import { cn } from "@/lib/utils";
import { range } from "@/utils";

type Props = {
    value: string;
    onChange: (value: string) => void;
    /** Called once all six digits are in. */
    onComplete?: () => void;
    /** Whether to mark the pin as wrong. */
    invalid?: boolean;
};

/** A lobby's six-digit pin, typed or pasted into a box per digit, in two groups of three. */
export default function PinInput({ value, onChange, onComplete, invalid = false }: Props) {
    return (
        <OTPInput
            value={value}
            onChange={onChange}
            {...(onComplete && { onComplete })}
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            aria-label="Game PIN"
            containerClassName={cn("flex items-center justify-center gap-2", invalid && "animate-shake")}
            render={({ slots }) => (
                <>
                    <div className="flex gap-2">
                        {range(0, 3).map((position) => (
                            <Slot key={position} {...slots[position]} invalid={invalid} />
                        ))}
                    </div>
                    <div aria-hidden="true" className="size-2 rounded-full bg-muted-foreground/50" />
                    <div className="flex gap-2">
                        {range(3, slots.length).map((position) => (
                            <Slot key={position} {...slots[position]} invalid={invalid} />
                        ))}
                    </div>
                </>
            )}
        />
    );
}

function Slot({ char, isActive, hasFakeCaret, invalid }: SlotProps & { invalid: boolean }) {
    return (
        <div
            className={cn(
                "relative flex h-16 w-12 items-center justify-center rounded-lg border-2 bg-input font-display text-4xl font-black italic lining-nums transition-all max-sm:h-14 max-sm:w-10 max-sm:text-3xl",
                isActive ? "border-primary ring-2 ring-primary/30" : "border-border",
                invalid && "border-destructive",
            )}
        >
            {char}
            {hasFakeCaret && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-px animate-caret-blink bg-foreground" />
                </div>
            )}
        </div>
    );
}
