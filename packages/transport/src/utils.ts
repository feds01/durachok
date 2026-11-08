/**
 * Check whether some item is not null and not undefined.
 *
 * @param o - The item to check.
 * @return Whether the item is defined, as a type assertion.
 */
export function isDef<T>(o: T | null | undefined): o is T {
    return typeof o !== "undefined" && o !== null;
}
