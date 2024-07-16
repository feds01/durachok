import IconButton from "@material-ui/core/IconButton";
import withStyles from "@material-ui/core/styles/withStyles";

const WhiteButton = withStyles((theme) => ({
    root: {
        '&.MuiButtonBase-root': {
            padding: theme.spacing(1),
        },

        '& svg': {
            color: "#e0e0e0",
        },
    },
}))(IconButton);

export default WhiteButton;
