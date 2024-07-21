import Lobby, { PopulatedGame } from "../models/game.model";

export async function getLobby(pin: string): Promise<PopulatedGame> {
    const lobby = await Lobby.findOne({ pin }).populate<
        Pick<PopulatedGame, "owner">
    >("owner");

    if (!lobby) {
        throw new Error("Lobby could not be found or was deleted.");
    }

    return lobby;
}
