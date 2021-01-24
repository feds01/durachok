/**
 * src/authentication.js
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
import {error} from "shared";
import User from "./models/user";
import express from "express";
import {Token} from "./auth";

type TokenPayload = {
    token: string,
    refreshToken: string,
}


export function validatePin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const pin: string = req.params.pin;

    // Check if 'pin' parameter follows the pin format we except - as in 6 digits long and only numerical characters
    if (pin.length !== 6 || !pin.match(/^\d{6}$/g)) {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Game PIN must be 6 digits."
        });
    } else {
        next();
    }
}


/**
 * A utility function to unpack the passed over authentication token. It will attempt
 * to decode the token which is meant to be located within the request header. It will try
 * to unpack the contents into an object under the namespace 'user_data'. So, the data from
 * the token is accessible by using 'req.token'.
 */
export async function getTokensFromHeader(req: express.Request, res: express.Response): Promise<Token<any> | null> {
    const token: string | string[] | undefined = req.headers["x-token"];

    try {
        // Decode the sent over JWT key using our secret key stored in the process' runtime.
        // Then carry on, even if the data is incorrect for the given request, since this does
        // not interpret the validity of the request.
        return jwt.verify(<string>token, process.env.JWT_SECRET_KEY!) as Token<any>;
    } catch (e) {
        const refreshToken = req.headers["x-refresh-token"];
        if (!refreshToken) return null;

        let newTokens;

        try {
            newTokens = await refreshTokens(<string>refreshToken);
        } catch (e) {
            return null;
        }

        // if new tokens were provided, update the access and refresh tokens
        if (newTokens.token && newTokens.refreshToken) {
            res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
            res.set("x-token", newTokens.token);
            res.set("x-refresh-token", newTokens.refreshToken);

            // pass on the metadata which was decoded from the JWT
            return jwt.verify(newTokens.token, process.env.JWT_SECRET_KEY!) as Token<any>;
        }

        return null;
    }
}

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
export async function refreshTokens (refreshToken: string): Promise<TokenPayload> {
    const decodedToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY!) as Token<any>;

    // generate new token values to replace old token's with refreshed ones.
    return await createTokens(decodedToken.data);
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
export const createTokens = async (payload: {}): Promise<TokenPayload> => {
    const token = await jwt.sign(
        {data: {...payload}},
        process.env.JWT_SECRET_KEY!,
        {
            expiresIn: "1h"
        },
    );

    // sign the refresh-token
    const refreshToken = await jwt.sign(
        {data: {...payload}},
        process.env.JWT_REFRESH_SECRET_KEY!,
        {
            expiresIn: "7d",
        },
    );

    // return the tokens as a resolved promise
    return {token, refreshToken};
}

export async function withAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const userToken = await getTokensFromHeader(req, res); // unpack JWT token

    // ensure that the user token has a valid user id, if they do then set the
    // request user token as the decoded token, otherwise don't bother.
    if (userToken?.data?.id) {
        const existingUser = await User.findOne({_id: userToken.data.id});

        if (existingUser) req.token = userToken;
    } else if (userToken) {

        // Looks like this could be a stale token, probably from a previous
        // anonymous game, therefore we should notify the client to discard it.
        return res.status(400).json({
            status: false,
            error: {token: "stale"}
        });

    }

    next();
}


export async function ownerAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const token = await getTokensFromHeader(req, res); // unpack JWT token

    // if the token is null, the token or refresh tokens aren't in the request
    //  headers
    if (!token) {
        // only send an un-authorized response if there was no provided token in the request
        return res.status(401).json({
            status: false,
            message: error.AUTHENTICATION_FAILED,
            extra: "Missing request headers."
        });
    }

    if (token?.data.id) {
        const existingUser = await User.findOne({_id: token.data.id});

        if (!existingUser) {
            return res.status(404).json({
                status: false,
                message: error.NON_EXISTENT_USER,
                extra: "User doesn't exist."
            });
        } else {
            req.token =  token;
            next(); // the request was fine and is authenticated.
        }
    } else {
        return res.status(401).json({
            status: false,
            message: error.UNAUTHORIZED,
            extra: "Invalid request headers."
        });
    }
}
