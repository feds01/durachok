import { Logger } from "pino";

import { CommonService } from "./common";

/** Service to orchestrate and manage a game.  */
export class GameService {
    public constructor(
        private readonly pin: string,
        private readonly logger: Logger,
        private readonly commonService: CommonService,
    ) {}
}
