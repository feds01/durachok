import express from 'express';
import * as error from "../error";
import User from './../models/user';

const router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('respond with a resource');
});

router.post('/register', async (req, res, next) => {
    const {email, password, name} = req.body;

    if (typeof email === 'undefined' || typeof password === 'undefined') {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Email and Password must be present when registering users."
        })
    }

    if (password.length < 12) {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Password must at least be 12 characters or longer."
        })
    }

    try {
        const existingUser = await User.find({email: email});

        if (existingUser) {
            return res.status(400).json({
               status: false,
               message: error.MAIL_EXISTS
            });
        }

    } catch (err) {
        return res.status(500).json({
           status: false,
           message: error.INTERNAL_SERVER_ERROR
        });
    }
});

export default router;
