import { Visibility, VisibilityOff } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField, { TextFieldProps } from "@mui/material/TextField/TextField";
import { ReactElement, useState } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";

interface Props<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    textFieldProps?: TextFieldProps;
}

export default function ControlledPasswordField<T extends FieldValues>({
    name,
    control,
    textFieldProps,
}: Props<T>): ReactElement {
    const [showPassword, setShowPassword] = useState<boolean>(false);
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
                marginBottom: 1,
                ...(!error && !textFieldProps?.helperText && { pb: "20px" }),
            }}
            {...textFieldProps}
            {...(typeof error !== "undefined" && {
                error: true,
                helperText: error.message,
            })}
            InputProps={{
                // @@Todo: this should be decided by the `TextFieldBackground` in `theme.ts`
                sx: {
                    backgroundColor: "#3b3d54",
                },
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton
                            sx={{ color: "rgba(172, 170, 190, 1)" }}
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            onMouseDown={(e) => e.preventDefault()}
                            edge="end"
                        >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                ),
            }}
            type={showPassword ? "text" : "password"}
        />
    );
}
