import { ReactElement } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";

import TextField, { TextFieldProps } from "@mui/material/TextField";

interface ControlledTextFieldProps<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    textFieldProps?: TextFieldProps;
}

const ControlledTextField = <T extends FieldValues>({
    name,
    control,
    textFieldProps,
}: ControlledTextFieldProps<T>): ReactElement => {
    const {
        field: { ref: _, ...inputProps },
        fieldState: { error },
    } = useController({
        name,
        control,
        rules: { required: true },
    });

    return (
        <TextField
            {...inputProps}
            fullWidth
            sx={{
                marginTop: 1,
            }}
            {...textFieldProps}
            {...(typeof error !== "undefined" && {
                error: true,
                helperText: error.message,
            })}
        />
    );
};

export default ControlledTextField;
