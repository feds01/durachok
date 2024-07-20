import { css } from "@emotion/css";
import PersonIcon from "@mui/icons-material/Person";
import { Typography } from "@mui/material";
import Avatar from "@mui/material/Avatar";

type Props = {
    avatarUri?: string;
    avatarSize?: number;
    name: string;
};

export default function PlayerAvatar({ name, avatarUri, avatarSize }: Props) {
    return (
        <div
            className={css`
                padding-top: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
            `}
        >
            <Avatar
                src={avatarUri}
                sx={{
                    width: avatarSize ?? 64,
                    height: avatarSize ?? 64,
                    color: "white",
                    background: "#1a1d3d",
                    b: "2px solid #3f51b5",
                }}
                alt={name}
            >
                <PersonIcon
                    sx={{
                        width: (avatarSize ?? 64) * 0.8,
                        height: (avatarSize ?? 64) * 0.8,
                    }}
                    fontSize={"large"}
                />
            </Avatar>
            <Typography component={"h1"} sx={{ m: 0 }}>
                {name}
            </Typography>
        </div>
    );
}
