import express from 'express';
import {nanoid} from "nanoid";
import Lobby from './../models/game';
import {createTokens, userAuth} from "../authentication";
import {checkNameFree, createGamePin} from "../utils/lobby";
import {error, game, lobby as LobbyUtils} from "shared";

const router = express.Router();

function validatePin(req, res, next) {
    const {pin} = req.params;

    // Check if 'pin' parameter follows the pin format we except - as in 6 digits long and only numerical characters
    if (pin.length !== 6 || isNaN(pin)) {
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
 * @version src-v0.0.1
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
router.post("/", userAuth, async (req, res) => {
    const {id} = req.token;

    // Perform some validation on the passed parameters
    let {maxPlayers, roundTimeout} = req.body;

    // attempt to parse both maxPlayers and roundTimeout
    try {
        maxPlayers = parseInt(maxPlayers);
        roundTimeout = parseInt(roundTimeout);
    } catch (e) {
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

    // if roundTimeout is set to '-1' this means that the game engine should not
    // enforce that players make a move/decision within the 60seconds.
    if (roundTimeout !== -1 && roundTimeout < 60) {
        return res.status(400).json({
            message: error.BAD_REQUEST,
            extra: "Round timeout must be at least one minute."
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
        passphrase: LobbyUtils.createGamePassphrase(),

        // automatically put the user into the lobby
        players: [
            // TODO: technically this connection should also be monitored for disconnects.
            //       If the connection severs, the lobby should be cleaned up.
            {name: req.token.name, sockedId: null, confirmed: true}
        ],
        rngSeed: nanoid(),
        owner: id,
    });

    try {
        const savedGame = await newGame.save();

        return res.status(201).json({
            status: true,
            message: "Successfully created new game.",
            game: {
                pin: savedGame.pin
            },
        })
    } catch (e) {
        console.log(e);

        return res.status(500).json({
            status: false,
            message: error.INTERNAL_SERVER_ERROR
        })
    }
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
router.get('/:pin', validatePin, async (req, res) => {
    const {pin} = req.params;

    const lobby = await Lobby.findOne({pin});

    if (!lobby) {
        return res.status(404).json({
            status: false,
            message: error.NON_EXISTENT_LOBBY,
        })
    }

    // notify client if they can't even join the current lobby if it's full or in sessions
    if (lobby.players.length === lobby.maxPlayers || lobby.status !== game.GameState.WAITING) {
        return res.status(400).json({
            status: false,
            message: error.LOBBY_FULL,
        })
    }

    return res.status(200).json({
        status: true,
        message: "Lobby exists.",
    });
});


/**
 * @version v1.0.0
 * @method DELETE
 * @url https://api.durachok.io/lobby/:id
 * @example https://api.durachok.io/lobby/123456
 *
 * @description This route is used to delete the game with the given pin. If the pin is not the proper
 * format, the standard BAD_REQUEST response is sent. If the requester is unauthorized to delete the
 * current game, the server will respond with an UNAUTHORIZED response. If the request is valid, the
 * object is deleted in the 'Games' mongo collection and the server responds with an OK.
 *
 * @param {number} pin: the identifier number of the game.
 *
 * @error {UNAUTHORIZED} if the requester doesn't have proper permissions.
 * @error {BAD_REQUEST} if the pin isn't 6 digits long which is the standard.
 * @error {BAD_REQUEST} if the pin isn't purely numerical as is the standard.
 * @error {NOT_FOUND} if the id of the game doesn't exist in the records.
 * @error {INTERNAL_SERVER_ERROR} if the current request can't be processed.
 *
 * @return sends an OK response to requester with some game data.
 * */
router.delete("/:pin", validatePin, userAuth, async (req, res) => {
    const {pin} = req.params;

    // check that the requesting user is the owner/creator of the lobby
    const lobby = await Lobby.findOne({pin});

    if (!lobby) {
        return res.status(404).json({
            status: false,
            message: error.NON_EXISTENT_LOBBY,
        })
    }

    // The lobby owner parameter should be the same as the the user id in the token.
    // If it's not we return a Unauthorized error code.
    if (!lobby.owner._id.equals(req.token.id)) {
        return res.status(401).json({
            status: false,
            message: "Unable to delete the game",
            extra: error.UNAUTHORIZED,
        })
    }

    return Lobby.deleteOne({pin}, (err) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: error.INTERNAL_SERVER_ERROR,
                extra: "Couldn't delete the game at this time."
            });
        }

        // TODO: kick everyone from the lobby if any connections are present.
        return res.status(200).json({
            status: true,
            message: "Successfully delete game lobby."
        })
    });
});

/**
 * @version v1.0.0
 * @method POST
 * @url https://api.durachok.io/lobby/:id/join
 * @example https://api.durachok.io/lobby/123456/join
 *
 * @description This route is used to join the given user to the game. It will use the requesters
 * IP and a combination of generated ID, and a pin to create a JWT token, for authentication.
 * The body of the request should also send over the passphrase to join the game. If the
 * passphrase is incorrect, the server will respond with an unauthorized and prevent the player
 * from joining the lobby. However, if the request is successful, the request will respond with
 * a JWT token that should be used to authenticate any requests made to the game lobby.
 *
 * @param {number} pin: the identifier number of the game.
 *
 * @error {UNAUTHORIZED} if the game passphrase is incorrect.
 * @error {BAD_REQUEST} if the pin isn't 6 digits long which is the standard.
 * @error {BAD_REQUEST} if the pin isn't purely numerical as is the standard.
 * @error {NOT_FOUND} if the id of the game doesn't exist in the records.
 * @error {INTERNAL_SERVER_ERROR} if the current request can't be processed.
 *
 * @return sends an OK response to requester with some game data.
 * */
router.post("/:pin/join", validatePin, async (req, res) => {
    const {pin} = req.params;
    const {passphrase, name} = req.body;

    // check that the requesting user is the owner/creator of the lobby
    const lobby = await Lobby.findOne({pin});

    if (!lobby) {
        return res.status(404).json({
            status: false,
            message: error.NON_EXISTENT_LOBBY,
        });
    }

    // check that there are free slots within the lobby
    if (lobby.players.length === lobby.maxPlayers || lobby.status !== game.GameState.WAITING) {
        return res.status(400).json({
            status: false,
            err: "LOBBY_FULL",
            message: error.LOBBY_FULL,
        });
    }


    if (typeof name === "undefined" || typeof passphrase === "undefined") {
        return res.status(400).json({
            status: false,
            err: "MISSING_INFO",
            message: error.BAD_REQUEST
        });
    }


    // check that the name is not taken within the lobby
    if (!(await checkNameFree(lobby, name))) {
        return res.status(400).json({
            status: false,
            err: "BAD_INFO",
            message: "Name already taken."
        })
    }


    if (lobby.passphrase !== passphrase) {
        return res.status(401).json({
            status: false,
            err: "INVALID_PASSPHRASE",
            message: error.INVALID_PASSPHRASE,
        });
    }

    // get the IP for the current request
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(/, /)[0] : req.connection.remoteAddress;

    // Generate JWT token for the current user connection with an encoded name and IP
    const {token, refreshToken} = await createTokens({ip, name, pin});

    // Add the player object to the players list in the game object and update
    // it in the collection
    const players = lobby.players;

    players.push({
        name, socketId: null, confirmed: false,
    });

    await Lobby.updateOne(
        {_id: lobby._id},
        {$set: {'players': lobby.players}}
    );

    return res.status(200).json({
        status: true,
        message: "Pin Valid",
        token,
        refreshToken,
    });
});


router.post("/:pin/name", async (req, res) => {
    const {pin} = req.params;
    const {name} = req.body;

    // check that the requesting user is the owner/creator of the lobby
    const lobby = await Lobby.findOne({pin});

    if (!lobby) {
        return res.status(404).json({
            status: false,
            message: error.NON_EXISTENT_LOBBY,
        });
    }

    if (typeof name === "undefined") {
        return res.status(400).json({
            status: false,
            message: error.BAD_REQUEST
        });
    }

    if (!(await checkNameFree(lobby, name))) {
        return res.status(400).json({
            status: false,
            message: "Name already taken."
        })
    }

    // notify the client that the user can register as that name
    return res.status(200).json({
        status: true,
        message: "Name not taken."
    });
});


export default router;
