import { css } from "@emotion/css";
import Button from "@mui/material/Button";
import { ThreeDots } from "react-loader-spinner";

type Props = {
    isSubmitting: boolean;
    disabled?: boolean;
    onClick: () => void;
};

export default function SubmitButton({
    disabled,
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
            type={"button"}
            onClick={onClick}
            disabled={disabled || isSubmitting}
            color={"primary"}
        >
            {isSubmitting ? (
                <ThreeDots color="#FFFFFF" height={20} width={40} />
            ) : (
                "Enter"
            )}
        </Button>
    );
}
