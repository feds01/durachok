import * as Yup from "yup";
import {Formik} from "formik";
import styles from './index.module.scss';
import Zoom from "@material-ui/core/Zoom";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import Divider from "@material-ui/core/Divider";
import React, {useEffect, useState} from 'react';
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";

import {getSettings, saveSettings} from "../../utils/settings";
import defaultSettings from "./../../assets/config/default_settings.json";

const SettingsSchema = Yup.object().shape({
    animateCardSort: Yup.bool().required(),
    playSuggestions: Yup.bool().required(),
}).nullable();

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Zoom in ref={ref} {...props} />;
});


const GameSettingsDialog = (props) => {
    const [settings, setSettings] = useState(getSettings());
    const [saveStatus, setSaveStatus] = useState("");

    // Load up settings from local storage to see what player has set.
    useEffect(() => {
        try {
            // User hasn't initialised settings yet...
            if (!SettingsSchema.validateSync(settings)) {
                let localSettings = {};

                Object.keys(defaultSettings).forEach((setting) => {
                    localSettings[setting] = defaultSettings[setting];
                });

                setSettings(localSettings);
            }

            saveSettings(settings);
        } catch (e) {
            saveSettings(defaultSettings);
        }

    }, [settings]);

    useEffect(() => {
        let timeout;

        if (saveStatus !== "") {
            // queue a 2 second function to reset the status to an empty string
            timeout = setTimeout(() => {setSaveStatus("")}, 2000);
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        }
    }, [saveStatus]);

    async function submit(values) {
        setSettings(values);
        setSaveStatus("Saved!")
    }

    return (
        <Dialog
            {...props}
            maxWidth={"xs"}
            TransitionComponent={Transition}
            PaperProps={{
                style: {background: "none"}
            }}
        >
            <Formik
                initialValues={settings}
                onSubmit={submit}
            >
                {(props => <GameSettingsForm {...props} saveStatus={saveStatus}/>)}
            </Formik>
        </Dialog>
    );
};

const GameSettingsForm = (props) => {
    const {values, handleChange, isSubmitting, handleSubmit, saveStatus} = props;

    return (
        <div className={styles.Dialog}>
            <h2>Game Settings</h2>
            <Divider style={{marginBottom: '1em', marginTop: 2, backgroundColor: ' #dad8ec'}}/>
            <div className={styles.Inputs}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={values.animateCardSort}
                            onChange={handleChange}
                            name="animateCardSort"
                            color="primary"
                        />
                    }
                    label="Enable sorting animation for deck"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={values.playSuggestions}
                            onChange={handleChange}
                            name="playSuggestions"
                            color="primary"
                        />
                    }
                    label="Enable auto suggestions for card placements"
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
                    {saveStatus ? saveStatus : "Save"}
                </Button>
            </div>
        </div>
    );
}

export default GameSettingsDialog;
