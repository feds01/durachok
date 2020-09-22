import express from 'express';
import * as error from "../error";
import User from './../models/user';
import bcrypt from 'bcryptjs';

const router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('respond with a resource');
});

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

    if (typeof email === 'undefined' || typeof password === 'undefined') {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Email and Password must be present when registering a new user."
        })
    }

    if (password.length < 8) {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Password must at least be 8 characters or longer."
        })
    }

    try {
        const existingUser = await User.find({email: email});

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

export default router;
