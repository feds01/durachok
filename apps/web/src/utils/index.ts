/**
 * A function that returns the result of a callback.
 *
 * Useful for writing scoped expressions.
 *
 * Example:
 *
 * ```ts
 * const result = expr(() => {
 *    if ( ... ) {
 *      return ...;
 *    }
 *
 *    return ...;
 * });
 *
 * @param cb
 * @returns
 */
export const expr = <T>(cb: () => T): T => cb();

/**
 * Check whether some item is not null and not undefined.
 *
 * @param o - The item to check.
 * @return Whether the item is defined, as a type assertion.
 */
export function isDef<T>(o: T | null | undefined): o is T {
    return typeof o !== "undefined" && o !== null;
}

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
