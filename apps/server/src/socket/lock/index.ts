// A map of game pins that the server maybe currently processing with a
// boolean value to represent whether it can accept a request. This lock
// map is intended to prevent events being processed concurrently and
// mutating the game state in an un-for seen way.
const lockMap: Map<string, boolean> = new Map();

type Lock = {
    release(): void;
};

export function acquireLock(pin: string): Lock {
    const lock = lockMap.get(pin);

    if (lock) {
        throw new Error("Lock already acquired.");
    }

    lockMap.set(pin, true);

    return {
        release: () => {
            lockMap.set(pin, false);
        },
    };
}

export function releaseLock(lock: Lock) {
    lock.release();
}
