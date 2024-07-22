import { css } from "@emotion/css";
import { Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useNavigate } from "@tanstack/react-router";

import { trpc } from "../utils/trpc";

const card = css`
    display: flex;
    flex-direction: row;
    padding: 1em;
    margin-bottom: 0.5em;
    margin-top: 0.5em;
    border-radius: 12px;
    max-width: 300px;
    background: #3f51b5;
    box-shadow:
        0 10px 20px rgba(0, 0, 0, 0.19),
        0 6px 6px rgba(0, 0, 0, 0.23);

    color: white;

    &:hover {
        cursor: pointer;
    }
`;

// @@Todo: move this into `common`
type GameStatus = "waiting" | "playing" | "finished";

type Props = {
    pin: string;
    status: GameStatus;
    players: number;
    maxPlayers: number;
};

export default function GameLinkCard({
    pin,
    status,
    players,
    maxPlayers,
}: Props) {
    const navigator = useNavigate();
    const deleteGame = trpc.lobbies.delete.useMutation();

    const onDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        await deleteGame.mutateAsync({ pin });
        // @@Todo: force the `user` to be re-fetched.
    };

    return (
        <Box
            className={card}
            onClick={() => navigator({ to: `/lobby/$pin`, params: { pin } })}
        >
            <Box sx={{ flex: 1 }}>
                <Box
                    sx={{
                        flex: 1,
                        justifyContent: "space-between",
                        alignItems: "center",
                        display: "flex",
                        flexDirection: "row",
                    }}
                >
                    <Typography fontSize={24} component={"code"}>
                        {pin}
                    </Typography>
                    <Typography>{status}</Typography>
                </Box>
                <Box sx={{ textAlign: "center", mt: 2, mb: 2 }}>
                    <Typography component={"h1"}>
                        {players} / {maxPlayers}
                    </Typography>
                </Box>
                <Box
                    className={css`
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    `}
                >
                    <Button
                        variant="contained"
                        onClick={onDelete}
                        disableElevation
                        color="secondary"
                    >
                        Delete
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
