import express from 'express';
import * as error from "../error";
import Lobby from './../models/game';

const router = express.Router();

/**
 * @version v1.0.0
 * @method GET
 * @url https://api.durachok.io/lobby/:id
 * @example https://api.durachok.io/lobby/123456
 *
 * @description This route is used to check if the game exists, and if so will return
 * the games metadata.
 *
 * @param {number} pin: the identifier number of the game.
 *
 * @error {BAD_REQUEST} if the pin isn't 6 digits long which is the standard.
 * @error {BAD_REQUEST} if the pin isn't purely numerical as is the standard.
 * @error {NOT_FOUND} if the id of the game doesn't exist in the records.
 * @error {INTERNAL_SERVER_ERROR} if an attempt to retrieve the game fails.
 *
 * @return sends an OK response to requester with some game data.
 *
 * */
router.get('/:pin', async (req, res, next) => {
    // Check if 'pin' parameter follows the pin format we except - as in 6 digits long and only numerical characters
    if (req.params.pin.length !== 6 || isNaN(req.params.pin)) {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Game PIN must be 6 digits."
        });
    }

    await Lobby.find({}, (err, collection) => {
        console.log(collection);
    });
});

export default router;
