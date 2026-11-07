import { useEffect, useState } from "react";

/** How often the owner's waiting room asks for a new passphrase. */
const ROTATION_SECONDS = 20;

type Props = {
    /** The lobby's passphrase, which only the owner sees. */
    passphrase: string;
    /** Ask the server for a new passphrase. */
    onRotate: () => void;
};

/**
 * The lobby's passphrase, as the owner reads it out to the players who join. It changes
 * every {@link ROTATION_SECONDS} seconds, so a passphrase that got out stops working.
 *
 * Give it the passphrase as its `key`, so that a new passphrase restarts the countdown.
 */
export default function LobbyPassphrase({ passphrase, onRotate }: Props) {
    const [secondsLeft, setSecondsLeft] = useState(ROTATION_SECONDS);

    useEffect(() => {
        const tick = setInterval(() => setSecondsLeft((seconds) => Math.max(seconds - 1, 0)), 1000);
        const rotation = setInterval(onRotate, ROTATION_SECONDS * 1000);

        return () => {
            clearInterval(tick);
            clearInterval(rotation);
        };
    }, [onRotate]);

    return (
        <section className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4">
            <h2 className="m-0 font-body text-sm uppercase tracking-widest text-muted-foreground">Passphrase</h2>
            <div className="flex gap-2" aria-label={`Passphrase ${passphrase}`}>
                {Array.from(passphrase).map((symbol) => (
                    <span
                        key={symbol}
                        className="flex h-20 w-16 select-none items-center justify-center rounded-lg border-2 border-primary text-5xl text-primary"
                    >
                        {symbol}
                    </span>
                ))}
            </div>
            <p className="m-0 font-body text-muted-foreground" aria-live="polite">
                Changes in {secondsLeft}s
            </p>
        </section>
    );
}
