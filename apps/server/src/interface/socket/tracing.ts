import { AbstractAction } from "zod-sockets";

import { type ErrorKind, inSpan, toError } from "../../lib/tracing";
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
    const { type } = transformErrorIntoMessage(toError(error));
    return { type, fault: type === "internal" };
}

/** Handle a client's event in a span of its own, which records what the handling throws, @see socketErrorKind. */
export function traceEvent(event: string, clientId: string, handle: () => Promise<void>): Promise<void> {
    const attributes = { "rpc.system": "socket.io", "rpc.method": event, "socket.io.client_id": clientId };
    return inSpan(`socket ${event}`, attributes, handle, socketErrorKind);
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
        return traceEvent(this.event, params.client.id, () => this.#action.execute(params));
    }
}
