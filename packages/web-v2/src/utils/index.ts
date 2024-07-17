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
export function assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}
