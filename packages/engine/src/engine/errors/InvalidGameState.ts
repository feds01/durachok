/** An error that the game engine throws when a move, or the game state, is invalid. */
export class InvalidGameState extends Error {
    public override name = "InvalidGameState";
}

export default InvalidGameState;
