/**
 * api/credentials.js
 *
 * Module description:
 *
 * This is a module to holds utility methods that are used within the User Accounts
 * and Documents API's. These methods don't belong to a sub-system within the API,
 * and are considered to be general purpose. Hence they are defined and stored here.
 *
 * Created on 29/09/2018
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

const EMAIL_REGULAR_EXPRESSION = /^(([^<>()\]\\.,;:\s@"]+(\.[^<>()\]\\.,;:\s@"]+)*)|(".+"))@(([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;


/**
 * This is a utility method to test a given string to see if it is within a
 * valid email format. The regular expression that is used to test the string
 * can be found https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
 *
 * @param {String} email: the string which is being tested if it is a valid email format string
 * @returns {Boolean} if the email parameter is a valid email format string.
 * */
export const validateEmail = (email) => {
    return EMAIL_REGULAR_EXPRESSION.test(email.toLowerCase());
};
