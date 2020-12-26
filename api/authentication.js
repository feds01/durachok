/**
 * api/authentication.js
 *
 * Module description:
 * This module holds all the authentication tools that the API uses. The module
 * has methods to generate and refresh JWT tokens and the two methods for authenticating
 * User Accounts API requests and Documents API requests.
 *
 * Created on 22/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import jwt from "jsonwebtoken";
import * as error from "./error";
import User from "./models/user";


/**
 * A utility function to unpack the passed over authentication token. It will attempt
 * to decode the token which is meant to be located within the request header. It will try
 * to unpack the contents into an object under the namespace 'user_data'. So, the data from
 * the token is accessible by using 'req.token'.
 */
const getToken = async (req, res) => {
    const token = req.headers["x-token"];

    if (token) {
        try {
            // De-Code the sent over JWT key using our secret key stored in the process' runtime.
            // Then carry on, even if the data is incorrect for the given request, since this does
            // not interpret the validity of the request.
            req.token = jwt.verify(token, process.env.JWT_SECRET_KEY);
        } catch (e) {
            const refreshToken = req.headers["x-refresh-token"];

            const newTokens = await refreshTokens(refreshToken);

            // if new tokens were provided, update the access and refresh tokens
            if (newTokens.token && newTokens.refreshToken) {
                res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
                res.set("x-token", newTokens.token);
                res.set("x-refresh-token", newTokens.refreshToken);

                // pass on the metadata which was decoded from the JWT
                req.token = newTokens.data;
            } else {
                return res.status(401).json({
                    status: false,
                    message: error.AUTHENTICATION_FAILED,
                });
            }
        }
    } else {
        // only send an un-authorized response if there was no provided token in the request
        return res.status(401).json({
            status: false,
            message: error.AUTHENTICATION_FAILED,
        });
    }
};

/**
 * This method is used to refresh the tokens on a authentication request. It will use
 * the 'x-refresh-token' in the request header to attempt to verify the request. If the
 * refresh token isn't stale (out of date) the method will use createTokens() function
 * to generate two new tokens and it will return them. The method also returns data on
 * the user so that can be associated with the 'req.token' in getToken().
 *
 * @param {String} refreshToken: JWT refresh token in string form used to authorise a refresh
 *        of the access tokens.
 * @returns {Object} The object contains the new token, new refresh token and the decoded user data
 * @error if the refreshToken is stale, the method will return an empty object.
 * */
const refreshTokens = async (refreshToken) => {
    try {
        const decodedToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);

        // generate new token values to replace old token's with refreshed ones.
        const {newToken, newRefreshToken} = await createTokens(decodedToken);

        return {
            token: newToken,
            refreshToken: newRefreshToken,
        };

    } catch (e) {
        console.log("failed to refresh JWT.")
        return {};
    }
}

/**
 * This function will generate two JWT tokens from a user's username and UUID. This
 * information is packed into the token to be later used for authentication. The method
 * creates a 'token' and 'refresh-token' for usage. The token is signed using the secret
 * 'JWT_SECRET_KEY' whereas the 'refresh-token' is signed using the 'JWT_REFRESH_SECRET_KEY'
 * which differ in values.
 *
 * @param {Object} payload: string representing the user's email
 * @returns an object comprised of the token and refresh token.
 * */
export const createTokens = async (payload) => {
    const token = await jwt.sign(
        {...payload},
        process.env.JWT_SECRET_KEY,
        {
            expiresIn: "1h"
        },
    );

    // sign the refresh-token
    const refreshToken = await jwt.sign(
        {...payload},
        process.env.JWT_REFRESH_SECRET_KEY,
        {
            expiresIn: "7d",
        },
    );

    // return the tokens as a resolved promise
    return {token, refreshToken};
}

/**
 * This is a user specific authentication method. It will check if the request parameter
 * 'username' is equal to the username in the 'x-token' header within the request. This
 * authentication middleware function is only used for user routes rather than document
 * routes.
 * */
export const authenticate = async (req, res, next) => {
    await getToken(req, res); // unpack JWT token

    if (!res.headersSent) {
        // check if the token email matches the email, if it does we know
        // that this request is valid, otherwise reject this request and return an
        // 'Unauthorized' status to the client.
        if (req.token.id) {
            const existingUser = await User.find({_id: req.token.id});

            if (existingUser.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: error.NON_EXISTENT_USER,
                    extra: "User doesn't exist."
                });
            }
        }
        next();
    }
};

export const userAuth = async (req, res, next) => {
    await getToken(req, res); // unpack JWT token

    if (!res.headersSent) {

        if (req.token.id) {
            const existingUser = await User.find({_id: req.token.id});

            if (existingUser.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: error.NON_EXISTENT_USER,
                    extra: "User doesn't exist."
                });
            } else {
                // the request was fine and is authenticated.
                next();
            }
        } else {
            return res.status(401).json({
                status: false,
                message: error.UNAUTHORIZED,
                extra: "Missing required request headers."
            });
        }
    }
};
