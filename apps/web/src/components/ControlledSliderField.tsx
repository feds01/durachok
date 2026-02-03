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
    className,
}: ControlledSliderInputProps<T>) => {
    return (
        <div className={cn("space-y-4 pt-4", className)}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <>
                        {legend && (
                            <Label className="text-lg text-foreground" htmlFor={name}>
                                {legend}
                            </Label>
                        )}

                        <div className="py-2">
                            <Slider
                                value={[field.value]}
                                onValueChange={(value) => field.onChange(value[0])}
                                min={min}
                                max={max}
                                step={step}
                            />
                            {marks && (
                                <div className="flex justify-between text-md text-muted-foreground">
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
