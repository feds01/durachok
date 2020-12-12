import express from 'express';
import bcrypt from 'bcryptjs';
import User from './../models/user';
import Lobby from './../models/game';

import * as error from "../error";
import * as credentials from "../credentials";
import {createTokens, userAuth} from "../authentication";

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
router.post('/register', async (req, res, next) => {
    let {email, password, name} = req.body;

    if (typeof email === 'undefined' || typeof password === 'undefined' || typeof name === "undefined") {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Email and Password must be present when registering a new user."
        })
    }

    if (!credentials.validateEmail(email)) {
        return res.status(400).json({
            message: error.BAD_REQUEST,
            extra: error.INVALID_EMAIL
        });
    }


    if (password.length < 8) {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Password must at least be 8 characters or longer."
        })
    }

    try {
        const existingUser = await User.find({
            $or: [
                {name: name},
                {email: email}
            ]
        });

        if (existingUser.length !== 0) {
            return res.status(400).json({
                status: false,
                message: error.MAIL_EXISTS
            });
        }

        // generate the salt for the new user account;
        const salt = await bcrypt.genSalt();

        return await bcrypt.hash(password, salt, async (err, hash) => {
            if (err) throw (err);

            // create the user object and save it to the table
            const newUser = new User({email, password: hash, name});

            try {
                const savedUser = await newUser.save();

                return res.status(201).json({
                    status: true,
                    message: "Successfully created new user account.",
                    extra: savedUser,
                })
            } catch (e) {
                console.log(e);

                return res.status(500).json({
                    status: false,
                    message: error.INTERNAL_SERVER_ERROR
                })
            }
        });


    } catch (err) {
        console.log(err);

        return res.status(500).json({
            status: false,
            message: error.INTERNAL_SERVER_ERROR
        });
    }
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
    let searchQuery = {email: email};

    // If the request contains the 'email' parameter in the query string and it's
    // a valid email string, then use email to authenticate the user.
    if (typeof name === "string") {
        searchQuery = {name: name}
    } else if (typeof email !== 'string' || !credentials.validateEmail(email)) {
        return res.status(400).json({
            status: false,
            message: error.INVALID_EMAIL,
            extra: "No username or email provided to login route."
        });
    }

    if (typeof password !== 'string') {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "No password provided to login route."
        });
    }

    await User.find(searchQuery, async (err, result) => {
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
        if (result.length === 1) {
            bcrypt.compare(password, result[0].password, async (err, response) => {
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
                    const {token, refreshToken} = await createTokens({email: result[0].email, id: result[0]._id});

                    // set the tokens in the response headers
                    res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
                    res.set("x-token", token);
                    res.set("x-refresh-token", refreshToken);

                    return res.status(302).json({
                        status: true,
                        message: "Authentication successful",
                        token,
                        refreshToken
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
 * @example
 * https://durachok.game/api/user
 *
 * @description This route is used to login users into the Durachok game app, the route
 * will accept a username or email & password within the request body. The method will determine
 * which authentication strategy the request is using. If an email is provided, the user will
 * be authenticated using email, and vice versa for username. If a user is found with email/username,
 * the sent over password will be compared with stored hash. If hash and password match, the request
 * will create two request tokens 'x-token' and 'x-refresh-token' and apply them to response header.
 * Additionally, the 'last_login' column is updated, and a 'USER_LOGIN' event is added in user's timeline.
 *
 *
 * @error {UNAUTHORIZED} if the request does not contain a token or refreshToken
 *
 * @return sends a response to client if user successfully (or not) logged in. The response contains
 * a list of the current games the user is hosting and the users name.
 *
 * */
router.get("/", userAuth, async (req, res) => {
    const id = req.token.id;

    // find all the games that are owned by the current player.
    const games = (await Lobby.find({owner: id})).map((game) => {
       return {
           players: game.players.length,
           pin: game.pin,
           roundTimeout: game.roundTimeout,
           maxPlayers: game.maxPlayers,
       }
    });

    return res.status(200).json({
        status: true,
        data: {
            games: games,
            name: req.token.name,
        }
    })
});


    export default router;
