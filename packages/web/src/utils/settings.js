import defaultSettings from "./../assets/config/default_settings.json";

/**
 * Function to get a setting item from local storage settings.
 *
 * @param {string} name - The name of the setting.
 * @return {?any} The value stored for the setting.
 * */
export function getSetting(name) {
    try {
        const settings = JSON.parse(localStorage.getItem("settings"));

        if (Object.keys(settings).includes(name)) {
            return settings[name];
        } else {
            return defaultSettings[name] || null;
        }

    } catch (e) {
        return defaultSettings[name];
    }
}

export function getSettings() {
    try {
        return JSON.parse(localStorage.getItem("settings"));
    } catch (e) {
        // save a default version to localStorage and return it
        localStorage.setItem("settings", JSON.stringify(defaultSettings));

        return defaultSettings;
    }
}

/**
 * Function to update the localstorage with a new token and refresh
 * token.
 *
 * @param {string} name - The name of the setting to set.
 * @param {any} value - The value stored for the setting
 * */
export function saveSetting(name, value) {
    try {
        const settings = JSON.parse(localStorage.getItem("settings"));
        settings[name] = value;

        // save the setting to localStorage
        localStorage.setItem("settings", JSON.stringify(settings));
        window.dispatchEvent( new Event('storage') );
    } catch (e) {
        const defaults = defaultSettings;
        defaults[name] = value;

        // save the setting to localStorage
        localStorage.setItem("settings", JSON.stringify(defaults));
        window.dispatchEvent( new Event('storage') );
    }
}

export function saveSettings(settings) {
    try {
        localStorage.setItem("settings", JSON.stringify(settings));
        window.dispatchEvent( new Event('storage') );
    } catch (e) {
        console.warn("Failed to save settings.");
    }
}

export function resetSettings() {
    localStorage.setItem("settings", JSON.stringify(defaultSettings));
    window.dispatchEvent( new Event('storage') );
}
