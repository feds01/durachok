import React, {useEffect} from "react";
import {getSettings} from "../utils/settings";

// Create a Context
const SettingContext = React.createContext(getSettings());

export const SettingProvider = ({ children }) => {
    // This is the exact same logic that we previously had in our hook

    const [setting, setSetting] = React.useState(getSettings());

    const handleSettingUpdate = () => {
        setSetting(getSettings());
    }

    useEffect(() => {
        window.addEventListener("storage", handleSettingUpdate);
        return () => window.removeEventListener("storage", handleSettingUpdate);
    }, []);

    /* Now we are dealing with a context instead of a Hook, so instead
       of returning the width and height we store the values in the
       value of the Provider */
    return (
        <SettingContext.Provider value={{ ...setting }}>
            {children}
        </SettingContext.Provider>
    );
};

/* Rewrite the "useViewport" hook to pull the width and height values
   out of the context instead of calculating them itself */
export const useSetting = () => {
    /* We can use the "useContext" Hook to access a context from within
       another Hook, remember, Hooks are composable! */
    const {playSuggestions, animateCardSort} = React.useContext(SettingContext);

    return {playSuggestions, animateCardSort};
}
