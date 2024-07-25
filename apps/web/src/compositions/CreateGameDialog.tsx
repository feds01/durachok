import { css } from "@emotion/css";
import { Typography } from "@mui/material";
import Dialog from "@mui/material/Dialog";

import Divider from "../components/Divider";
import CreateGameForm from "../forms/CreateGameForm";

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function CreateGameDialog({ open, onClose }: Props) {
    return (
        <Dialog open={open} onClose={onClose}>
            <div
                className={css`
                    padding: 1em 2em;
                    background: #3b3d54;
                `}
            >
                <Typography
                    component={"h2"}
                    className={css`
                        font-size: 28px !important;
                        color: #dad8ec;
                        margin: 0;
                    `}
                >
                    Create new game
                </Typography>
                <Divider />

                <CreateGameForm onSuccess={onClose} />
            </div>
        </Dialog>
    );
}
