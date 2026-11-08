import { CardFan } from "@/components/Loader";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props extends ButtonProps {
    isSubmitting: boolean;
    label?: string;
}

/** A form's button, which shows the fan of cards in place of its label while the form is sent. */
export default function SubmitButton({ disabled, label, isSubmitting, className, ...rest }: Props) {
    return (
        <Button
            type="submit"
            disabled={disabled || isSubmitting}
            aria-busy={isSubmitting}
            // A button that's busy isn't one that can't be used, so it doesn't fade.
            className={cn("w-full", isSubmitting && "disabled:opacity-100", className)}
            {...rest}
        >
            {isSubmitting ? (
                <>
                    <CardFan size="sm" />
                    <span className="sr-only">{label ?? "Enter"}…</span>
                </>
            ) : (
                (label ?? "Enter")
            )}
        </Button>
    );
}
