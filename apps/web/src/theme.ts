import { outlinedInputClasses } from "@mui/material/OutlinedInput";
import { createTheme } from "@mui/material/styles";

const theme = () =>
    createTheme({
        palette: {},
        components: {
            MuiTextField: {
                styleOverrides: {
                    root: {
                        "--TextField-brandBorderColor": "#E0E3E7",
                        "--TextField-brandBorderHoverColor": "#B2BAC2",
                        "--TextField-brandBorderFocusedColor": "white",
                        "& label.Mui-focused": {
                            color: "var(--TextField-brandBorderFocusedColor)",
                        },
                    },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    input: {
                        color: "white",
                    },
                    notchedOutline: {
                        borderColor: "var(--TextField-brandBorderColor)",
                    },
                    root: {
                        [`&:hover .${outlinedInputClasses.notchedOutline}`]: {
                            borderColor: "var(--TextField-brandBorderHoverColor)",
                        },
                        [`&.Mui-focused .${outlinedInputClasses.notchedOutline}`]: {
                            borderColor: "var(--TextField-brandBorderFocusedColor)",
                        },
                    },
                },
            },
            MuiFilledInput: {
                styleOverrides: {
                    root: {
                        "&::before, &::after": {
                            borderBottom: "2px solid var(--TextField-brandBorderColor)",
                        },
                        "&:hover:not(.Mui-disabled, .Mui-error):before": {
                            borderBottom: "2px solid var(--TextField-brandBorderHoverColor)",
                        },
                        "&.Mui-focused:after": {
                            borderBottom: "2px solid var(--TextField-brandBorderFocusedColor)",
                        },
                    },
                },
            },
        },
    });

export default theme;
