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
