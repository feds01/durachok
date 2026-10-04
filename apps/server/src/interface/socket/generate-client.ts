import { writeFile } from "node:fs/promises";
import { Integration } from "zod-sockets/integration";

import { actions } from "./actions";
import { config } from "./config";

await writeFile("../web/src/interface/socket-client.ts", new Integration({ config, actions }).print(), "utf-8");
