import { ReactElement, useState } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    label?: string;
    placeholder?: string;
    className?: string;
    required?: boolean;
}

export default function ControlledPasswordField<T extends FieldValues>({
    name,
    control,
    label,
    placeholder,
    className,
    required,
}: Props<T>): ReactElement {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const {
        field: { ref: _ref, ...inputProps },
        fieldState: { error },
    } = useController({
        name,
        control,
        rules: { required },
    });

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <Label htmlFor={name}>
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
            )}
            <div className="relative">
                <Input
                    {...inputProps}
                    id={name}
                    type={showPassword ? "text" : "password"}
                    placeholder={placeholder}
                    className={cn("pr-10", error && "border-destructive")}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="toggle password visibility"
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
        </div>
    );
}
