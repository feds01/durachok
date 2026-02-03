import { ReactElement } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ControlledTextFieldProps<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    label?: string;
    placeholder?: string;
    type?: string;
    className?: string;
    required?: boolean;
}

const ControlledTextField = <T extends FieldValues>({
    name,
    control,
    label,
    placeholder,
    type = "text",
    className,
    required,
}: ControlledTextFieldProps<T>): ReactElement => {
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
            <Input
                {...inputProps}
                id={name}
                type={type}
                placeholder={placeholder}
                className={cn(error && "border-destructive")}
            />
            {error && <p className="text-sm text-destructive">{error.message}</p>}
        </div>
    );
};

export default ControlledTextField;
