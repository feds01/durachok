/**
 * Module description:   src/utils/equal.js
 *
 * Utility equality and comparison functions for objects
 * Created on 16/02/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

/**
 * A function that will perform a deep comparison of two given object properties.
 * The function will return a boolean to denote whether both objects have the exact
 * same properties and identical property values,
 *
 * @param {Object|Number|String} left - Left hand-side object in comparison
 * @param {Object|Number|String} right - right hand-side object in comparison
 * @return {Boolean} comparison result
 * */
export function deepEqual(left, right) {
    if (left === right) {
        return true;
    } else if ((typeof left == "object" && left != null) && (typeof right == "object" && right != null)) {
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);

        if (leftKeys.length !== rightKeys.length) {
            return false;
        }

        for (const prop in left) {
            if (rightKeys.indexOf(prop) !== -1) {
                if (!deepEqual(left[prop], right[prop])) return false;
            } else return false;
        }
        return true;
    } else return false;
}


/**
 * A function that will perform a shallow comparison of two given arrays.
 * The comparison method does not care about order of elements, if the
 * arrays have the same elements in them (in any order), the arrays are
 * considered to be equal.
 *
 * @param {Array} left - Left hand-side object in comparison
 * @param {Array} right - right hand-side object in comparison
 * @return {Boolean} comparison result
 * */
export function arraysEqual(left, right) {
    if (
        !Array.isArray(left)
        || !Array.isArray(right)
        || left.length !== right.length
    ) {
        return false;
    }

    // .concat() is used so the original arrays are unaffected
    const arr1 = left.concat().sort();
    const arr2 = right.concat().sort();

    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }

    return true;
}
