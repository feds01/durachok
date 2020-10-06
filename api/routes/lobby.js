import express from 'express';
import {nanoid} from "nanoid";
import * as error from "../error";
import Lobby from './../models/game';
import {authenticate} from "../authentication";
import {createGamePassphrase, createGamePin} from "../utils/lobby";

const router = express.Router();


/**
 * @version api-v0.0.1
 * @method POST
 * @url https://durachok.game/api/lobby
 * @example {
 *     "maxPlayers": 5,
 *     "roundTimeout": 120
 * }
 * @description This path is used to create a new game lobby by an existent user. The request accepts a
 * few game parameters about the game like the number of allowed players, round time out, etc. These parameters
 * will be used to create a new game lobby object in the game table. A pin and passphrase will be generated for
 * the lobby so that it stop from anyone joining but the friends that you want to join. Once the lobby is created,
 * joining the lobby can be done by making a request to 'POST /lobby/:pin/join'. This method will return the pin of
 * the game lobby, and a passphrase to join it.
 *
 *
 * @param {number} maxPlayers - number to represent the maximum number of people allowed to join the game.
 * @param {number} roundTimeout - timeout in seconds when the player forfeits the round
 *
 *
 * @error {BAD_REQUEST} if maxPlayers isn't in the defined range or not a number.
 * @error {BAD_REQUEST} if roundTimeout isn't a number.
 * @error {SERVER_ERROR} if the server failed to create a new lobby/
 * @error {AUTHENTICATION_FAILED} if JWT not provided or invalid.
 *
 * @return sends a response to client if the document was created and added to the system.
 * */
router.post("/", authenticate, async (req, res) => {
    const {userId} = req.token;


    // Perform some validation on the passed parameters
    const {maxPlayers, roundTimeout} = req.body;

    if (typeof maxPlayers !== "number") {
        return res.status(400).json({
            message: error.BAD_REQUEST,
            extra: "Maximum players must be a number."
        });
    }

    if (maxPlayers < 2 || maxPlayers > 8) {
        return res.status(400).json({
            message: error.BAD_REQUEST,
            extra: "Game must have between two to eight players."
        });
    }

    if (typeof roundTimeout !== "number") {
        return res.status(400).json({
            message: error.BAD_REQUEST,
            extra: "Game timeout must be a number."
        });
    }

    let gamePin, existingGame;

    // Generate a unique game pin, and check that it's unique by ensuring no
    // other game entry with the given pin exists.
    do {
        gamePin = createGamePin();
        existingGame = await Lobby.find({pin: gamePin});

    } while (existingGame.length !== 0);


    // create the user object and save it to the table
    const newGame = new Lobby({
        maxPlayers,
        roundTimeout,
        pin: gamePin,
        passphrase: createGamePassphrase(),
        players: {
            [userId]: [],
        },
        rngSeed: nanoid(),
        owner: userId,
    });

    try {
        const savedGame = await newGame.save();

        return res.status(201).json({
            status: true,
            message: "Successfully created new user account.",
            extra: savedGame,
        })
    } catch (e) {
        console.log(e);

        return res.status(500).json({
            status: false,
            message: error.INTERNAL_SERVER_ERROR
        })
    }
});

router.delete("/:pin", authenticate, async (req, res) => {
    const {pin} = req.params;

    // Check if 'pin' parameter follows the pin format we except - as in 6 digits long and only numerical characters
    if (pin.length !== 6 || isNaN(pin)) {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Game PIN must be 6 digits."
        });
    }

    // check that the requesting user is the owner/creator of the lobby
    const lobby = await Lobby.findOne({pin});

    if (!lobby) {
        return res.status(404).json({
            status: false,
            message: error.NON_EXISTENT_LOBBY,
        })
    }

    // The lobby owner parameter should be the same as the the userId in the token.
    // If it's not we return a Unauthorized error code.
    if (!lobby.owner._id.equals(req.token.userId)) {
        return res.status(401).json({
            status: false,
            message: "Unable to delete the game",
            extra: error.UNAUTHORIZED,
        })
    }

    return await Lobby.deleteOne({pin}, (err) => {
       if (err) {
           return res.status(500).json({
               status: false,
               message: error.INTERNAL_SERVER_ERROR,
               extra: "Couldn't delete the game at this time."
           });
       }

       return res.status(200).json({
           status: true,
           message: "Successfully delete game lobby."
       })
    });
});

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
router.get('/:pin', authenticate, async (req, res, next) => {
    const {pin} = req.params;

    // Check if 'pin' parameter follows the pin format we except - as in 6 digits long and only numerical characters
    if (pin.length !== 6 || isNaN(pin)) {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST,
            extra: "Game PIN must be 6 digits."
        });
    }

    const lobby = await Lobby.findOne({pin});

    if (!lobby) {
        return res.status(404).json({
            status: false,
            message: error.NON_EXISTENT_LOBBY,
        })
    }

    return res.status(200).json({
        status: true,
        item: lobby,
    })
});

router.post("/:pin/join", authenticate, async (req, res, next) => {

});

export default router;
