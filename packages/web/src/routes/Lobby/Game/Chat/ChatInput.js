import React from 'react';
import * as Yup from "yup";
import {Formik} from "formik";
import PropTypes from 'prop-types';
import {ServerEvents} from "shared";
import Paper from '@material-ui/core/Paper';
import SendIcon from '@material-ui/icons/Send';
import Divider from '@material-ui/core/Divider';
import {makeStyles} from '@material-ui/core/styles';
import InputBase from '@material-ui/core/InputBase';
import IconButton from '@material-ui/core/IconButton';
import {useChatState} from "../../../../contexts/chat";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: '2px 4px',
        marginBottom: 2,
        display: 'flex',
        alignItems: 'center',
        width: 290,

        '&.MuiPaper-root': {
            backgroundColor: "#26262c !important",
            boxShadow: "none",
            border: "1px solid",
            borderColor: 'rgba(172, 170, 190, 1)',
        }
    },
    input: {
        marginLeft: theme.spacing(1),
        color: 'rgba(172, 170, 190, 1)',
        fontSize: 14,
        flex: 1,
    },
    iconButton: {
        color: "#acaabe !important",
        margin: "0 4px !important",
        padding: 10,
    },
    divider: {
        height: 28,
        margin: 4,
        borderColor: "rgba(172, 170, 190, 1)"
    },
}));

const MessageSchema = Yup.object().shape({
    message: Yup.string().max(200).required(),
});

export default function ChatInput(props) {
    const classes = useStyles();
    const {disabled} = useChatState();

    function sendMessage(payload) {
        props.socket.emit(ServerEvents.MESSAGE, payload);
    }

    return (
        <Formik
            initialValues={{message: ""}}
            validationSchema={MessageSchema}
            onSubmit={(values, helpers) => {
                sendMessage(values);

                helpers.setSubmitting(false);
                helpers.resetForm(); // clear message input after submit
            }}
        >
            {(formikProps => {
                const {
                    values,
                    isSubmitting,
                    handleChange,
                    handleSubmit
                } = formikProps;

                return (
                    <Paper component="form" onSubmit={handleSubmit} className={classes.root}>
                        <InputBase
                            value={values.message}
                            onChange={handleChange}
                            onKeyDown={(e) => e.stopPropagation()}
                            disabled={disabled}
                            className={classes.input}
                            name={"message"}
                            autoComplete={"off"}
                            placeholder="Send message…"
                            inputProps={{'aria-label': 'send message'}}
                        />
                        <Divider className={classes.divider} orientation="vertical"/>
                        <IconButton
                            color="primary"
                            type={"submit"}
                            disabled={disabled || isSubmitting}
                            className={classes.iconButton}
                            aria-label="directions"
                        >
                            <SendIcon/>
                        </IconButton>
                    </Paper>
                )
            })}
        </Formik>
    );
}

ChatInput.propTypes = {
    socket: PropTypes.object.isRequired,
}
