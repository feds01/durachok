import { useState } from "react";

/*
 * The player's on and off choices, such as whether the game makes sounds, which their
 * browser remembers if it can. Without storage, a choice lasts until the page reloads.
 */

export type Preference = "muted" | "hints";

const DEFAULTS: Record<Preference, boolean> = { muted: false, hints: false };

export function readPreference(preference: Preference): boolean {
    try {
        const stored = localStorage.getItem(preference);
        return stored === null ? DEFAULTS[preference] : stored === "true";
    } catch {
        return DEFAULTS[preference];
    }
}

/** A preference, and a way to change it. */
export function usePreference(preference: Preference): [boolean, (value: boolean) => void] {
    const [value, setValue] = useState(() => readPreference(preference));

    const update = (next: boolean) => {
        setValue(next);
        try {
            localStorage.setItem(preference, String(next));
        } catch {
            // The choice lasts until the page reloads.
        }
    };

    return [value, update];
}
