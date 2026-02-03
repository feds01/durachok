import { Control, Controller, FieldValues, Path } from "react-hook-form";

import { isDef } from "@/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ControlledSwitchInputProps<T extends FieldValues> {
    label: string;
    legend?: string;
    name: Path<T>;
    control: Control<T>;
    className?: string;
}

const ControlledSwitchInput = <T extends FieldValues>({
    label,
    legend,
    name,
    control,
    className,
}: ControlledSwitchInputProps<T>) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => (
                <div className={cn("space-y-2 pt-4", className)}>
                    {legend && <Label className="text-lg text-foreground">{legend}</Label>}
                    <div className="flex items-center space-x-2">
                        <Checkbox id={name} checked={field.value} onCheckedChange={field.onChange} />
                        <Label htmlFor={name} className="text-md font-normal text-foreground cursor-pointer">
                            {label}
                        </Label>
                    </div>
                    {isDef(error) && <p className="text-md text-destructive">{error?.message}</p>}
                </div>
            )}
        />
    );
};

export default ControlledSwitchInput;
