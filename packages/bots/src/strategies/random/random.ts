import { PlayerMove } from "@durachok/transport";

import { Observation } from "../../observation";
import { Strategy } from "../../strategy";

/** Makes any of the moves that the player can, at random: a baseline that other strategies should beat. */
export class RandomStrategy implements Strategy {
    public constructor(private readonly random: () => number = Math.random) {}

    public decide({ moves }: Observation): PlayerMove {
        return moves[Math.floor(this.random() * moves.length)]!;
    }
}
