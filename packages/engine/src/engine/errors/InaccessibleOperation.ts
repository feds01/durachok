/** An error that the game engine throws when an operation isn't open in the game's state, such as any change once it has finished. */
export class InaccessibleOperation extends Error {
    public override name = "InaccessibleOperation";
}

export default InaccessibleOperation;
