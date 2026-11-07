import { ActionsFactory, ClientContext, Config } from "zod-sockets";

import { config } from "../config";

export const factory = new ActionsFactory(config);

/** The root namespace of the socket config, with its emissions and client metadata. */
type RootNamespace = typeof config extends Config<infer T> ? T["/"] : never;
type RootContext = ClientContext<RootNamespace["emission"], RootNamespace["metadata"]>;

/** A connected client, as the actions see it. */
export type Client = RootContext["client"];

/** Room-scoped emitting, as the actions see it. */
export type Rooms = RootContext["withRooms"];
