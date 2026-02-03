import { ThreeDots } from "react-loader-spinner";

import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props extends ButtonProps {
    isSubmitting: boolean;
    label?: string;
}

export default function SubmitButton({ disabled, label, isSubmitting, className, ...rest }: Props) {
    return (
        <Button type="submit" disabled={disabled || isSubmitting} className={cn("w-full", className)} {...rest}>
            {isSubmitting ? <ThreeDots color="#FFFFFF" height={20} width={40} /> : (label ?? "Enter")}
        </Button>
    );
}
