import { Control, Controller, FieldValues, Path } from "react-hook-form";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ControlledSliderInputProps<T extends FieldValues> {
    legend?: string;
    name: Path<T>;
    control: Control<T>;
    min?: number;
    max?: number;
    step?: number;
    marks?: { value: number; label: string }[];
    /** Show the chosen value beside the legend, formatted, e.g. as "300s". */
    format?: (value: number) => string;
    className?: string;
}

const ControlledSliderInput = <T extends FieldValues>({
    legend,
    name,
    control,
    min = 0,
    max = 100,
    step = 1,
    marks,
    format,
    className,
}: ControlledSliderInputProps<T>) => {
    return (
        <div className={cn("space-y-3", className)}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <>
                        {legend && (
                            <div className="flex items-center justify-between">
                                <Label className="text-base text-foreground" htmlFor={name}>
                                    {legend}
                                </Label>
                                {format && (
                                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-sm text-foreground">
                                        {format(field.value)}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Slider
                                value={[field.value]}
                                onValueChange={(value) => field.onChange(value[0])}
                                min={min}
                                max={max}
                                step={step}
                            />
                            {marks && (
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    {marks.map((mark) => (
                                        <span key={mark.value}>{mark.label}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            />
        </div>
    );
};

export default ControlledSliderInput;
