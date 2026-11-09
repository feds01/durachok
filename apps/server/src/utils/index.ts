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
        throw new Error(`Assertion failed: ${message ?? "condition failed"}`);
    }
}
