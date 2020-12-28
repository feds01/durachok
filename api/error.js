/**
 * api/error.js
 *
 * Module description:
 *
 * This module holds constant error messages which can be used through out the API service.
 * It contains generic error messages for bad requests, failed authentication, etc and API
 * specific error messages.
 *
 * Created on 13/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

export const MISMATCHING_LOGIN = "password or email fields incorrect/don't match.";
export const BAD_REQUEST = "The API request is malformed or invalid";
export const UNAUTHORIZED = "User doesn't have permissions to perform this action.";
export const AUTHENTICATION_FAILED = "Authentication failed";
export const INTERNAL_SERVER_ERROR = "Durachok Internal Server Error.";

// Lobby API request errors
export const NON_EXISTENT_LOBBY = "No lobby exists with the given PIN.";
export const INVALID_PASSPHRASE = "Invalid passphrase for lobby.";
export const LOBBY_FULL = "Lobby is full or currently in session.";

// User Accounts API request errors
export const NON_EXISTENT_USER = "No user with the given username exists";
export const INVALID_EMAIL = "The given mail is invalid or not provided.";
export const INVALID_USERNAME = "The given username is invalid or not provided";
export const MAIL_EXISTS = "The given mail is already registered.";
export const USER_INIT_FAILED = "Failed to initialise/create a new user";
