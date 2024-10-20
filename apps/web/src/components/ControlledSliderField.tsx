import FieldLabel from "./FieldLabel";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

import { FormControl, Slider, SliderProps, styled } from "@mui/material";

const StyledSlider = styled(Slider)({
    color: "#3f51b5 ",
    height: 2,
    padding: "15px 0",

    "& .MuiSlider-rail": {
        height: 2,
        opacity: 0.5,
        backgroundColor: "#dad8ec",
    },
    "& .MuiSlider-mark": {
        backgroundColor: "#bfbfbf",
        height: 8,
        width: 1,
        marginTop: -3,
        "&.MuiSlider-markActive": {
            opacity: 1,
            backgroundColor: "currentColor",
        },
    },

    "& .MuiSlider-markLabel": {
        color: "#dad8ec",
    },
});

interface ControlledSliderInputProps<T extends FieldValues>
    extends SliderProps {
    legend?: string;
    name: Path<T>;
    control: Control<T>;
}

const ControlledSliderInput = <T extends FieldValues>({
    legend,
    name,
    control,
    ...rest
}: ControlledSliderInputProps<T>) => {
    return (
        <FormControl sx={{ pt: "1em" }}>
            {legend && <FieldLabel sx={{ color: "#dad8ec" }} label={legend} />}
            <Controller
                name={name}
                control={control}
                render={({ field }) => <StyledSlider {...field} {...rest} />}
            />
        </FormControl>
    );
};

export default ControlledSliderInput;
