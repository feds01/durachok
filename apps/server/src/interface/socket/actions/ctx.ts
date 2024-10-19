import { z } from "zod";
import { ActionsFactory, ClientContext, EmissionMap } from "zod-sockets";

import { config } from "../config";

export const factory = new ActionsFactory(config);

export type Client = ClientContext<EmissionMap, z.AnyZodObject>["client"];
