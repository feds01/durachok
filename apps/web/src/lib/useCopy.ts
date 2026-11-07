import { useCallback, useEffect, useState } from "react";

/**
 * Copy text to the clipboard, and say for a moment that it was copied.
 *
 * @returns Whether the text was just copied, and the function that copies it.
 */
export function useCopy(resetAfter = 2000): [boolean, (text: string) => Promise<void>] {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = setTimeout(() => setCopied(false), resetAfter);
        return () => clearTimeout(timer);
    }, [copied, resetAfter]);

    const copy = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        } catch {
            // The browser refused, e.g. outside a secure context. The text is on screen anyway.
        }
    }, []);

    return [copied, copy];
}
