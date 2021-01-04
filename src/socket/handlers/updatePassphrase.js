import {error, events} from "shared";
import Lobby from "../../models/game";

// TODO: this should be ideally server side... Could be done with CRON
//      jobs but im not sure if that is also a suitable solution.

// TODO: Should we prevent a client updating a passphrase if 2FA is disabled?
async function handler(context, socket) {
    if (!socket.isAdmin) socket.emit(events.ERROR, new Error(error.UNAUTHORIZED));

    // update the passphrase in the MongoDB with the one the client said
    try {
        await Lobby.updateOne({_id: socket.lobby._id}, {passphrase: context.passphrase});

        // @cleanup: this might be redundant since the server will return an error if it doesn't
        // manage to update the passphrase.
        socket.emit(events.UPDATED_PASSPHRASE, {passphrase: context.passphrase});
    } catch (e) {
        console.log(e)
        socket.emit(events.ERROR, new Error(error.INTERNAL_SERVER_ERROR));
    }
}

export default handler;
