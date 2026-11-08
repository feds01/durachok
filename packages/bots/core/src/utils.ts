/** Whether a value is neither null nor undefined. */
export function isDef<T>(o: T | null | undefined): o is T {
    return o !== null && o !== undefined;
}
