/** An error that the game engine throws when a game can't be created. */
export class GameInitError extends Error {
    public override name = "GameInitError";
}

export default GameInitError;
