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
import {createGame} from "../../utils/networking";

const GameDialog = (props) => {
    const history = useHistory();

    return (
        <Dialog {...props}>
            <Formik
                initialValues={{roundTimeout: 300, maxPlayers: 2}}
                onSubmit={async (values, {setSubmitting}) => {
                    await createGame(values).then((res) => {
                        if (!res.status) {
                            console.log("failed to create game. Notify...")

                            // close the dialog
                            props.onClose();
                        } else {
                            setSubmitting(false);

                            // re-direct the user of the lobby to the game lobby
                            history.push(`/lobby/${res.game.pin}`)
                        }
                    })
                }}
            >
                {props => {
                    const {
                        values,
                        isSubmitting,
                        handleSubmit,
                    } = props;

                    return (
                        <div className={styles.Dialog}>
                            <h2>
                                Create new game
                            </h2>
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
                            </div>
                            <div className={styles.Submit}>
                                <Button
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
                }}
            </Formik>
        </Dialog>
    );
};

export default GameDialog;
