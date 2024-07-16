import Lobby, {IGame} from "../models/game";

export async function getLobby(pin: string): Promise<IGame> {
    const lobby = await Lobby.findOne({pin});

    if (!lobby) {
        throw new Error("Lobby could not be found or was deleted.");
    }

    return lobby;
}
