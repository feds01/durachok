/** An error that the game engine throws when the game history is invalid. */
export class InvalidHistoryState extends Error {
    public override name = "InvalidHistoryState";
}

export default InvalidHistoryState;
