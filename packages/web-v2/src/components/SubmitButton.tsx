import Button from "@mui/material/Button";
import { ThreeDots } from "react-loader-spinner";

import { isDef } from "../utils";

type Props = {
    /** Whether the button is in a submitting state. */
    isSubmitting: boolean;
    /** Whether the button is disabled. */
    disabled?: boolean;
    /** The function to call when the button is clicked. */
    onClick?: () => void;
    /** The text to display on the button. */
    label?: string;
    /** The kind of button. */
    type?: "button" | "submit" | "reset";
    /** Optional class name string. */
    className?: string;
};

export default function SubmitButton({
    disabled,
    type,
    label,
    isSubmitting,
    className,
    onClick,
}: Props) {
    return (
        <Button
            variant={"contained"}
            {...(isDef(className) && { className })}
            disableElevation
            disableRipple
            type={type ?? "button"}
            {...(isDef(onClick) && { onClick })}
            disabled={disabled || isSubmitting}
            color={"primary"}
        >
            {isSubmitting ? (
                <ThreeDots color="#FFFFFF" height={20} width={40} />
            ) : (
                (label ?? "Enter")
            )}
        </Button>
    );
}
