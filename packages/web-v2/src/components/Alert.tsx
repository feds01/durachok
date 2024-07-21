import { SxProps } from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import { useState } from "react";
import { useTimeout } from "usehooks-ts";

/** The kind of alert that we should display */
export type AlertKind = "success" | "info" | "warning" | "error";

type AlertProps = {
    /** The kind of alert that we should display */
    kind: AlertKind;
    /** The message to display */
    message: string;
    /** Any additional styling overrides */
    sx?: SxProps;
    /** Whether the alert should disappear from view after a certain time.  */
    shouldDisappear?: boolean;
    /** The time in milliseconds after which the alert should disappear. */
    timeout?: number;
};

const AlertWrapper = ({
    kind,
    message,
    sx,
    shouldDisappear = true,
    timeout = 5000,
}: AlertProps) => {
    const [open, setOpen] = useState(true);

    const hide = () => {
        if (shouldDisappear) {
            setOpen(false);
        }
    };

    useTimeout(hide, timeout);

    return (
        <Box sx={{ width: "100%", ...(sx && sx) }}>
            <Collapse in={open}>
                <Alert severity={kind}>{message}</Alert>
            </Collapse>
        </Box>
    );
};

export default AlertWrapper;
