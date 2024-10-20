import FieldLabel from "./FieldLabel";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

import { isDef } from "@/utils";
import {
    Checkbox,
    CheckboxProps,
    FormControl,
    FormControlLabel,
    FormHelperText,
} from "@mui/material";

interface ControlledSwitchInputProps<T extends FieldValues>
    extends CheckboxProps {
    label: string;
    legend?: string;
    name: Path<T>;
    control: Control<T>;
}

const ControlledSwitchInput = <T extends FieldValues>({
    label,
    legend,
    name,
    control,
    ...rest
}: ControlledSwitchInputProps<T>) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => (
                <FormControl
                    sx={{ pt: "1em" }}
                    {...(isDef(error) && {
                        error: true,
                    })}
                >
                    {legend && (
                        <FieldLabel sx={{ color: "#dad8ec" }} label={legend} />
                    )}
                    <FormControlLabel
                        // @@Dumbness: passing with {...field} doesn't work for the initial render...
                        control={
                            <Checkbox
                                checked={field.value}
                                onChange={(e) =>
                                    field.onChange(e.target.checked)
                                }
                                {...rest}
                            />
                        }
                        sx={{ color: "#dad8ec" }}
                        label={label}
                    />
                    {isDef(error) && (
                        <FormHelperText>{error?.message}</FormHelperText>
                    )}
                </FormControl>
            )}
        />
    );
};

export default ControlledSwitchInput;
