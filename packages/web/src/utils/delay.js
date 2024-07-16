/**
 * Function to delay the execution of a passed function 'fn' by some
 * given time. After the timeout has completed, the function is called.
 *
 * @param {Function} fn - The function that is to be called
 * @param {number} time - The timeout before the function is invoked.
 * */
export function delay(fn, time = 200) {
    return new Promise((resolve) => {
        setTimeout(() => {
            fn();
            resolve();
        }, time);
    });
}
