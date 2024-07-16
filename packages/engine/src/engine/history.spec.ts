import {Game} from "./game";
import {History, HistoryNode} from "./history";


describe("History sub-system tests", () => {

    describe("History", () => {
        test("should create a new game without crashing", () => {
            const game = new Game(["player1", "player2"], null);

            expect(() => new History(game.serialize().state, null)).not.toThrow()
        });
    });


    describe("HistoryNode",  () => {
        test(("Adding an action to a finalised HistoryNode should throw"), () => {
            const node = new HistoryNode([], true);

            expect(() => node.addAction({type: "forfeit", player: "player"})).toThrow();
        });
    });
});
