import { z } from "zod";
import { ActionsFactory, ClientContext, EmissionMap } from "zod-sockets";

import { config } from "../config";

export const factory = new ActionsFactory(config);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Client = ClientContext<EmissionMap, z.ZodObject<any>>["client"];
