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
                <div className={cn("space-y-1", className)}>
                    {/* The whole row toggles the setting. */}
                    <Label
                        htmlFor={name}
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-background/40 p-3 transition-colors hover:border-primary"
                    >
                        <span className="flex flex-col gap-0.5">
                            {legend && <span className="text-base text-foreground">{legend}</span>}
                            <span className="text-sm font-normal text-muted-foreground">{label}</span>
                        </span>
                        <Checkbox id={name} checked={field.value} onCheckedChange={field.onChange} />
                    </Label>
                    {isDef(error) && <p className="m-0 text-sm text-destructive">{error?.message}</p>}
                </div>
            )}
        />
    );
};

export default ControlledSwitchInput;
