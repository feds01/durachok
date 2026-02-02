import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { SxProps } from "@mui/system";

interface FieldLabelProps {
    label: string;
    required?: boolean;
    sx?: SxProps;
}

const FieldLabel = ({ label, sx, required = false }: FieldLabelProps) => {
    return (
        <Typography variant={"body2"} sx={{ fontWeight: "bold", ...sx }}>
            {label}
            {required && (
                <Box component={"span"} sx={{ color: (t) => t.palette.error.main }}>
                    *
                </Box>
            )}
        </Typography>
    );
};

export default FieldLabel;
