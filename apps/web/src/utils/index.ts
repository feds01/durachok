import { expr, isDef } from "@durachok/transport";

// The helpers that every package shares, from the one that the others all depend on.
export { expr, isDef };

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
 * The positions from `start` up to `end`, e.g. of the slots of an input or the cards of a pile,
 * which key what is rendered at each of them.
 *
 * @param start - The first position, or the number of positions from 0 when there is no `end`.
 * @param end - The position after the last.
 */
export function range(start: number, end?: number): number[] {
    const [from, to] = isDef(end) ? [start, end] : [0, start];
    return Array.from({ length: Math.max(to - from, 0) }, (_, offset) => from + offset);
}

/**
 * The time of day of a timestamp, in the reader's own format, e.g. 14:05.
 *
 * @param time - The timestamp, in milliseconds.
 */
export function formatTime(time: number): string {
    return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
