import React from 'react';
import {Formik} from "formik";
import {useHistory} from "react-router";
import styles from './index.module.scss';
import Loader from "react-loader-spinner";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";

import MaterialSlider from "../MaterialSlider";
import Checkbox from "@material-ui/core/Checkbox";
import {createGame} from "../../utils/networking/lobby";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import {makeStyles} from "@material-ui/core/styles";

const defaultGameParameters = {
    roundTimeout: 300,
    maxPlayers: 4,
    with2FA: false,
    randomPlayerOrder: true,
    shortGameDeck: false,
    freeForAll: true,
    disableChat: false,
};

const useStyles = makeStyles((theme) => ({
    checkBox: {
        '&.MuiIconButton-root': {
            paddingRight: 4
        }
    }
}))

const GameDialog = (props) => {
    const history = useHistory();

    async function submit(values, {setSubmitting}) {
        await createGame(values).then((res) => {
            if (!res.status) {
                // close the dialog
                props.onClose();
            } else {
                setSubmitting(false);

                // re-direct the user of the lobby to the game lobby
                history.push(`/lobby/${res.game.pin}`)
            }
        })
    }

    return (
        <Dialog
            {...props}
            maxWidth={"xs"}
            PaperProps={{
                style: {background: "none"}
            }}
        >
            <Formik
                initialValues={defaultGameParameters}
                onSubmit={submit}
            >
                {(props => <GameDialogForm {...props}/>)}
            </Formik>
        </Dialog>
    );
};

const GameDialogForm = (props) => {
    const classes = useStyles();
    const {values, handleChange, isSubmitting, handleSubmit} = props;

    return (
        <div className={styles.Dialog}>
            <h2>Create new game</h2>
            <Divider style={{marginBottom: '1em', marginTop: 2, backgroundColor: ' #dad8ec'}}/>
            <div className={styles.Inputs}>
                <Typography gutterBottom>
                    Round Timeout (seconds)
                </Typography>
                <MaterialSlider
                    value={values.roundTimeout}
                    name={"roundTimeout"}
                    getAriaValueText={() => values.roundTimeout}
                    marks={[
                        {value: 100, label: "100"},
                        {value: 600, label: "600"}
                    ]}
                    min={100}
                    max={600}
                    step={50}
                    valueLabelDisplay="auto"
                />
                <Typography gutterBottom>
                    Max Players
                </Typography>
                <MaterialSlider
                    value={values.maxPlayers}
                    name={'maxPlayers'}
                    getAriaValueText={() => values.maxPlayers}
                    marks={[
                        {value: 2, label: "2"},
                        {value: 8, label: "8"}
                    ]}
                    min={2}
                    max={8}
                    valueLabelDisplay="auto"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={values.with2FA}
                            onChange={handleChange}
                            className={classes.checkBox}
                            name="with2FA"
                            color="primary"
                        />
                    }
                    label="With 2 Factor Authentication"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={values.randomPlayerOrder}
                            onChange={handleChange}
                            className={classes.checkBox}
                            name="randomPlayerOrder"
                            color="primary"
                        />
                    }
                    label="Begin game with random player order"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={values.shortGameDeck}
                            onChange={handleChange}
                            className={classes.checkBox}
                            name="shortGameDeck"
                            color="primary"
                        />
                    }
                    label="Use a shorter game deck for the game (36 cards)"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={values.freeForAll}
                            onChange={handleChange}
                            className={classes.checkBox}
                            name="freeForAll"
                            color="primary"
                        />
                    }
                    label="Allow attackers to attack without waiting for their turn"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={values.disableChat}
                            onChange={handleChange}
                            className={classes.checkBox}
                            name="disableChat"
                            color="primary"
                        />
                    }
                    label="Disable lobby chat"
                />
            </div>
            <div className={styles.Submit}>
                <Button
                    type={"submit"}
                    variant={'contained'}
                    disableElevation
                    style={{
                        fontSize: 16,
                        marginTop: 19
                    }}
                    disableRipple
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    color={'primary'}
                >
                    {isSubmitting ?
                        <Loader type="ThreeDots" color="#FFFFFF" height={20} width={40}/> : "Create"}
                </Button>
            </div>
        </div>
    );
}

export default GameDialog;
