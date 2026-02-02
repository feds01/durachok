import { ThreeDots } from "react-loader-spinner";

import Button, { ButtonProps } from "@mui/material/Button";

interface Props extends ButtonProps {
    /** Whether the button is in a submitting state. */
    isSubmitting: boolean;
    /** The text to display on the button. */
    label?: string;
}

export default function SubmitButton({ disabled, label, isSubmitting, ...rest }: Props) {
    return (
        <Button
            variant={"contained"}
            disableElevation
            disableRipple
            disabled={disabled || isSubmitting}
            color={"primary"}
            {...rest}
        >
            {isSubmitting ? <ThreeDots color="#FFFFFF" height={20} width={40} /> : (label ?? "Enter")}
        </Button>
    );
}
