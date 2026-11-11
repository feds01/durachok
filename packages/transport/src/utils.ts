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
 * The result of a callback, for an expression that needs statements, such as early returns,
 * rather than nested ternaries.
 *
 * ```ts
 * const label = expr(() => {
 *     if (isOwner) {
 *         return "Start";
 *     }
 *     return "Waiting";
 * });
 * ```
 */
export const expr = <T>(cb: () => T): T => cb();

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
