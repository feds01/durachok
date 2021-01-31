import * as Joi from "joi";
import fetch from 'node-fetch';
import express from 'express';
import bcrypt from 'bcryptjs';
import User from './../models/user';
import Lobby from './../models/game';

import {ClientEvents, error} from "shared";
import {checkImage, uploadImage} from "../utils/image";
import {emitLobbyEvent} from "../socket";
import SchemaError from "../errors/SchemaError";
import {validateAccountCreateOrUpdate} from "../common/user";
import {createTokens, refreshTokens, ownerAuth} from "../authentication";

const router = express.Router();

/**
 * @version v1.0.0
 * @method POST
 * @url https://durachok.game/api/user/register
 * @example
 * https://durachok.game/api/user/register
 * body: {
 *     "email": "feds01@gmail.com",
 *     "name": "feds01",
 *     "password": "Password2020"
 * }
 *
 * @description This route is used to sign-up new users to the Durak game, the route will
 * accept a username, email & password within the request body. The password will be checked
 * to match the security criterion. Rules include the password length being at least 8 characters
 * long. Furthermore, the email will be validated against a common Regular expression to ensure
 * that bogus emails are not provided. Once input validation is passed, a search within the database
 * for the provided 'email' & 'username' to ensure that they are not already registered to another
 * user account. If all checks pass, the provided password is hashed, user initialisation is carried
 * out and the user data entry is added to the database. The route will send a 'CREATED' response if it
 * successfully created a user account.
 *
 * @param {String} name: a string which will represent the abbreviated name of the user. This does not have
 *        to be unique.
 * @param {String} email: a string in the format of an email, this will be used to carry out security
 *        checks on the user account & user notifications.
 *
 * @param {String} password: a string which will be the used for logging in and confirming sensitive operations.
 *
 * @error {BAD_REQUEST} if password does not match the security criterion.
 * @error {BAD_REQUEST} if the username is a null string, or contains illegal characters.
 * @error {INVALID_EMAIL} if the provided email does not match a standard email schema.
 * @error {MAIL_EXISTS} if the provided email/username is already registered to a user in the system.
 *
 * @return response to client if user was created and added to the system.
 * */
router.post('/register', async (req, res) => {
    let {email, password, name} = req.body;

    const RE_CAPTCHA_VERIFY_URL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RE_CAPTCHA}&response=`;

    try {
        await validateAccountCreateOrUpdate(true, {email, password, name});
    } catch (e) {
        if (e instanceof SchemaError) {
            return res.status(400).json({
                status: false,
                message: error.BAD_REQUEST,
                errors: e.errors,
            });
        } else {
            console.log(e);
            return res.status(500).json({
                status: false,
                message: error.INTERNAL_SERVER_ERROR,
            });
        }
    }

    // Validate ReCaptcha token if we're in production
    if (process.env.NODE_ENV === "production") {
        const captchaResponse = await fetch(RE_CAPTCHA_VERIFY_URL + req.body.token, {method: "POST"}).then(res => res.json());

        if (!captchaResponse.success) {
            return res.status(400).json({
                status: false,
                errors: {
                    token: "Failed verification"
                }
            });
        }
    }

    // generate the salt for the new user account;
    const salt = await bcrypt.genSalt();

    return bcrypt.hash(password, salt, async (err, hash) => {
        if (err) throw (err);

        // create the user object and save it to the table
        const newUser = new User({email, password: hash, name});

        try {
            const savedUser = await newUser.save();

            const {token, refreshToken} = await createTokens({email, name, id: savedUser._id});

            // set the tokens in the response headers
            res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
            res.set("x-token", token);
            res.set("x-refresh-token", refreshToken);

            return res.status(201).json({
                status: true,
                message: "Successfully created new user account.",
                name, email,
                token, refreshToken
            });
        } catch (e) {
            console.log(e);

            return res.status(500).json({
                status: false,
                message: error.INTERNAL_SERVER_ERROR
            })
        }
    });
});

/**
 * @version v1.0.0
 * @method POST
 * @url https://durachok.game/api/user/login
 * @example
 * https://durachok.game/api/user/login
 * body: {
 *     "email": "feds01@gmail.com",
 *     "password": "Password2020"
 * }
 *
 * @description This route is used to login users into the Durachok game app, the route
 * will accept a username or email & password within the request body. The method will determine
 * which authentication strategy the request is using. If an email is provided, the user will
 * be authenticated using email, and vice versa for username. If a user is found with email/username,
 * the sent over password will be compared with stored hash. If hash and password match, the request
 * will create two request tokens 'x-token' and 'x-refresh-token' and apply them to response header.
 * Additionally, the 'last_login' column is updated, and a 'USER_LOGIN' event is added in user's timeline.
 *
 * @param {string} email: a string in the format of an email, this will be used to carry out security
 * checks on the user account & user notifications.
 *
 * @param {string} password: a string which will be the used for logging in and confirming sensitive operations.
 *
 * @error {BAD_REQUEST} if no email field is provided in the request
 * @error {BAD_REQUEST} if no password field was provided in the request
 * @error {UNAUTHORIZED} if password does not match hash
 * @error {AUTHENTICATION_FAILED} if the username/email do not exist within the database,
 *
 * @return sends a response to client if user successfully (or not) logged in.
 *
 * */
router.post("/login", async (req, res) => {
    const {email, name, password} = req.body;

    const loginSchema = Joi.object().keys({
        name: Joi.string(),
        email: Joi.string().email(),
        password: Joi.string().required(),
    }).or("name", "email");

    const result = loginSchema.validate(req.body);

    if (result.error) {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Invalid user registration parameters.",
        });
    }

    const searchQuery = {
        $or: [
            ...(name ? [{name}] : []),
            ...(email ? [{email}] : []),
        ]
    }

    await User.findOne(searchQuery, {}, {}, async (err, result) => {
        if (err) {
            // Log the error in the server console & respond to the client with an
            // INTERNAL_SERVER_ERROR, since this was an unexpected exception.
            console.error(err);

            return res.status(500).json({
                status: false,
                message: error.INTERNAL_SERVER_ERROR
            });
        }

        // Important to send an authentication failure request, rather than a
        // username not found. This could lead to a brute force attack to retrieve
        // all existent user names.
        if (result) {
            bcrypt.compare(password, result.password, async (err, response) => {
                if (err) {
                    // Log the error in the server console & respond to the client with an
                    // INTERNAL_SERVER_ERROR, since this was an unexpected exception.
                    console.error(err);

                    return res.status(500).json({
                        status: false,
                        message: error.INTERNAL_SERVER_ERROR
                    });
                }

                // If the sent over password matches the hashed password within the database, generate the
                // 'x-token' and 'x-refresh-token' JWT's . Also, update the 'last_login' timestamp and record
                // an entry for the user logging in into the system.
                if (response) {
                    const {token, refreshToken} = await createTokens({
                        email: result.email,
                        name: result.name,
                        id: result._id
                    });

                    // set the tokens in the response headers
                    res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
                    res.set("x-token", token);
                    res.set("x-refresh-token", refreshToken);

                    return res.status(302).json({
                        status: true,
                        message: "Authentication successful",
                        name: result.name, email: result.email,
                        token, refreshToken
                    });
                } else {
                    // password did not match the stored hashed password within the database
                    return res.status(401).json({
                        status: false,
                        message: error.BAD_REQUEST,
                        extra: error.MISMATCHING_LOGIN
                    });
                }
            });
        } else {
            return res.status(401).json({
                status: false,
                message: error.AUTHENTICATION_FAILED,
                extra: error.MISMATCHING_LOGIN
            });
        }
    });
});

/**
 * @version v1.0.0
 * @method GET
 * @url https://durachok.game/api/user
 *
 * @description This route is used to fetch information about a user account, the route
 * will accept a token in the header of the request to authenticate the request.
 *
 * @error {UNAUTHORIZED} if the request does not contain a token or refreshToken
 *
 * @return sends a response to client if user successfully (or not) logged in. The response contains
 * a list of the current games the user is hosting and the users name.
 *
 * */
router.get("/", ownerAuth, async (req, res) => {
    const id = req.token!.data.id;

    // find all the games that are owned by the current player.
    const games = (await Lobby.find({owner: id})).map((game) => {
        return {
            players: game.players.length,
            pin: game.pin,
            with2FA: game.with2FA,
            roundTimeout: game.roundTimeout,
            maxPlayers: game.maxPlayers,
        }
    });


    const profileImage = await checkImage(`${id}.jpg`);


    return res.status(200).json({
        status: true,
        data: {
            games: games,
            name: req.token!.data.name,
            ...profileImage && {image: process.env.AWS_CLOUDFRONT_URI + `${id}.jpg`},
        }
    })
});

/**
 * @version v1.0.0
 * @method POST
 * @url https://durachok.game/api/user
 *
 * @description This route is used to update any user account information, the route
 * will accept a token in the header of the request to authenticate the request.
 *
 *
 *
 * @error {UNAUTHORIZED} if the request does not contain a token or refreshToken
 *
 * @return sends a response to client if user successfully (or not) logged in. The response contains
 * a list of the current games the user is hosting and the users name.
 *
 * */
router.post("/", ownerAuth, async (req, res) => {
    const id = req.token!.data.id;

    const user = await User.findById({_id: id});

    // This shouldn't happen because we prevent this from happening in ownerAuth middleware, however
    // it's possible that the user could of been deleted between? (This is incredibly unlikely!)
    if (!user) {
        return res.status(404).json({status: false, message: error.NON_EXISTENT_USER});
    }

    let params, hash;

    try {
        params = await validateAccountCreateOrUpdate(false, {
            ...req.body.name && (user.name !== req.body.name) && {name: req.body.name},
            ...req.body.email && (user.email !== req.body.email) && {email: req.body.email},
            ...req.body.password && {password: req.body.password}
        });
    } catch (e) {
        if (e instanceof SchemaError) {
            return res.status(400).json({
                status: false,
                message: error.BAD_REQUEST,
                errors: e.errors,
            });
        } else {
            return res.status(500).json({
                status: false,
                message: error.INTERNAL_SERVER_ERROR,
            });
        }
    }

    // if the password parameter was provided, we need to create a hash of it so it
    // is written to the db in that form.
    // generate the salt for the new user account;
    if (params.password) {
        const salt = await bcrypt.genSalt();
        hash = await bcrypt.hash(params.password, salt);

        if (!hash) {
            return res.status(500).json({
                status: false,
                message: error.INTERNAL_SERVER_ERROR,
            });
        }
    }

    await User.updateOne({_id: id}, {
        "$set": {
            ...params.name && {name: params.name},
            ...params.email && {email: params.email},
            ...hash && {password: hash},
        }
    });

    // Image uploading step, (if it exists of-course).
    if (req.body.image) {
        try {

            await uploadImage(`${id}.jpg`, req.body.image);
        } catch (e) {
            console.log(e);

            return res.status(400).json({
                status: false,
                message: error.BAD_REQUEST,
                extra: "Failed to upload profile image",
            });
        }
    }


    return res.status(200).json({
        status: true,
        message: "Successfully updated user details."
    });
});

/**
 * @version v1.0.0
 * @method DELETE
 * @url https://durachok.game/api/user
 *
 * @description This route is used to delete  a user account, the route
 * will accept a token in the header of the request to authenticate the request.
 * The route will delete any lobbies that the player has initiated, and likely in
 * the future any archived games.
 *
 * @error {UNAUTHORIZED} if the request does not contain a token or refreshToken
 *
 * @return sends a response to client if user successfully (or not) logged in. The response contains
 * a list of the current games the user is hosting and the users name.
 *
 * */
router.delete("/", ownerAuth, async (req, res) => {
    const id = req.token!.data.id;

    // This is quite silly that we have to query the database first and the delete it, can't
    // the database just return the deleted id's or documents?
    const lobbies = await Lobby.find({owner: id}).select({"pin": 1, "_id": 0});

    // Delete all of the users lobbies if any, and send a message to any lobby
    // participant that the lobby was removed/closed.
    await Lobby.deleteMany({owner: id}, {}, (err) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                status: true,
                message: "Couldn't delete user account at this time."
            });
        }

        // iter of lobbies and emit close_lobby event.
        lobbies.map((lobby) => {
            emitLobbyEvent(lobby.pin, ClientEvents.CLOSE, {reason: "lobby_closed"});
        });
    });

    // find all the games that are owned by the current player.
    return User.findOneAndDelete({_id: id}, {}, (err) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                status: true,
                message: "Couldn't delete user account at this time."
            });
        }

        //TODO: delete the user profile image!

        return res.status(200).json({
            status: true,
            message: "Successfully deleted user account."
        });
    });
});

/**
 * @version v1.0.0
 * @method POST
 * @url https://durachok.game/api/token
 * @description Route for client to refresh a JWT token. The request expect a refresh token within
 * the request header to use to refresh the tokens.
 *
 * @error {BAD_REQUEST} if the request does not contain a refreshToken in the request header.
 * */
router.post("/token", async (req, res) => {
    const refreshToken = req.headers['x-refresh-token'];

    if (typeof refreshToken === 'undefined' || !refreshToken) {
        return res.status(400).json({
            status: false,
            message: "Missing refresh token."
        });
    }

    try {
        const newTokens = await refreshTokens(<string>refreshToken);

        // set the tokens in the response headers
        res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
        res.set("x-token", newTokens.token);
        res.set("x-refresh-token", newTokens.refreshToken);

        return res.status(200).json({status: true, ...newTokens});
    } catch (e) {
        console.log(e);

        // Likely that the token is stale or malformed. We could also
        // re-direct the user to '/login' on this
        return res.status(400).json({
            status: false,
            message: "Invalid refresh token."
        });
    }

});

export default router;
