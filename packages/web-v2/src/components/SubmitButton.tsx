import { css } from "@emotion/css";
import Button from "@mui/material/Button";
import { ThreeDots } from "react-loader-spinner";

import { isDef } from "../utils";

type Props = {
    isSubmitting: boolean;
    disabled?: boolean;
    onClick?: () => void;
    label?: string;
    type?: "button" | "submit" | "reset";
};

export default function SubmitButton({
    disabled,
    type,
    label,
    isSubmitting,
    onClick,
}: Props) {
    return (
        <Button
            variant={"contained"}
            className={css`
                height: 60px;
                font-size: 2em !important;
                background-color: #3f51b5 !important;

                &:hover {
                    background-color: #3f51b5 !important;
                }
            `}
            disableElevation
            style={{
                marginTop: 19,
            }}
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
