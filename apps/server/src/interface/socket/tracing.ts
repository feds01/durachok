import { AbstractAction } from "zod-sockets";

import { type ErrorKind, inSpan } from "../../lib/tracing";
import { transformErrorIntoMessage } from "./error";

/** An action, as zod-sockets attaches it: the event that it handles, and in which namespace. */
interface SocketAction extends AbstractAction {
    readonly event: string;
    readonly namespace: PropertyKey;
}

/** What zod-sockets hands an action for each event that it handles. */
type EventParams = Parameters<AbstractAction["execute"]>[0];

/**
 * What kind of error happened in handling an event: the type that the client is told, and
 * whether it's the server's own fault, as an `internal` one is, rather than the client's.
 */
export function socketErrorKind(error: unknown): ErrorKind {
    const { type } = transformErrorIntoMessage(error instanceof Error ? error : new Error(String(error)));
    return { type, fault: type === "internal" };
}

/**
 * An action that handles each of its events in a span of its own, from checking what the client
 * sent to the handler finishing, so that an error that is the server's own is recorded on it.
 */
export class TracedAction extends AbstractAction {
    readonly #action: SocketAction;

    public constructor(action: SocketAction) {
        super();
        this.#action = action;
    }

    public get event(): string {
        return this.#action.event;
    }

    public get namespace(): PropertyKey {
        return this.#action.namespace;
    }

    public execute(params: EventParams): Promise<void> {
        const attributes = {
            "rpc.system": "socket.io",
            "rpc.method": this.event,
            "socket.io.client_id": params.client.id,
        };
        return inSpan(`socket ${this.event}`, attributes, () => this.#action.execute(params), socketErrorKind);
    }
}
