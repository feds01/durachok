import { useState } from "react";
import { useTimeout } from "usehooks-ts";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type AlertKind = "success" | "info" | "warning" | "error";

type AlertProps = {
    kind: AlertKind;
    message: string;
    className?: string;
    shouldDisappear?: boolean;
    timeout?: number;
};

const icons = {
    success: CheckCircle,
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
};

const variants = {
    success: "success" as const,
    info: "default" as const,
    warning: "warning" as const,
    error: "destructive" as const,
};

const AlertWrapper = ({ kind, message, className, shouldDisappear = true, timeout = 5000 }: AlertProps) => {
    const [open, setOpen] = useState(true);

    const hide = () => {
        if (shouldDisappear) {
            setOpen(false);
        }
    };

    useTimeout(hide, timeout);

    if (!open) return null;

    const Icon = icons[kind];

    return (
        <div className={cn("w-full transition-all duration-300", !open && "opacity-0 h-0", className)}>
            <Alert variant={variants[kind]}>
                <Icon className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
            </Alert>
        </div>
    );
};

export default AlertWrapper;
