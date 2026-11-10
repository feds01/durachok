import { expr, isDef, range } from "@durachok/transport";

// The helpers that every package shares, from the one that the others all depend on.
export { expr, isDef, range };

/**
 * Assert a condition.
 *
 * @param condition - The condition to check.
 * @param message  - The message to throw if the condition is false.
 */
export function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) {
        throw new Error(`Assertion failed: ${message ?? ""}`);
    }
}

/**
 * The time of day of a timestamp, in the reader's own format, e.g. 14:05.
 *
 * @param time - The timestamp, in milliseconds.
 */
export function formatTime(time: number): string {
    return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
