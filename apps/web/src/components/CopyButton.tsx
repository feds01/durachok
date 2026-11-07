import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

type Props = {
    /** The text to copy. */
    value: string;
    /** What the button copies, e.g. "Copy the pin". */
    label: string;
    className?: string;
};

/** A small icon button that copies some text, and shows a tick once it has. */
export default function CopyButton({ value, label, className }: Props) {
    const [copied, copy] = useCopy();

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn("text-muted-foreground hover:text-foreground", className)}
            onClick={() => copy(value)}
            aria-label={copied ? "Copied" : label}
            title={label}
        >
            {copied ? <Check className="text-primary" /> : <Copy />}
        </Button>
    );
}
