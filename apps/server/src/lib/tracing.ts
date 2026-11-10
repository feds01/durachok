import {
    type Attributes,
    type Span,
    SpanKind,
    SpanStatusCode,
    context,
    diag,
    DiagLogLevel,
    trace,
} from "@opentelemetry/api";
import { ATTR_ERROR_TYPE, ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

import logger from "./logger";

/*
 * Traces of what the server does: a span for each tRPC request and each socket event, which
 * records the errors that are the server's own. They're exported over OTLP/HTTP once the
 * standard `OTEL_*` environment variables say where to, @see startTracing. Until then, the
 * tracer is OpenTelemetry's no-op one, and the SDK isn't even loaded.
 */

/** The name that the server's traces go by, unless `OTEL_SERVICE_NAME` gives another. */
const SERVICE_NAME = "durachok-server";

/** The server's tracer, which does nothing until a provider is registered, @see startTracing. */
export const tracer = trace.getTracer(SERVICE_NAME);

/**
 * Whether the environment asks for traces: an OTLP endpoint for them, and neither the SDK nor
 * its trace exporter turned off, as OpenTelemetry's environment variables do.
 */
export function tracingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const endpoint = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || env.OTEL_EXPORTER_OTLP_ENDPOINT;
    return Boolean(endpoint) && env.OTEL_SDK_DISABLED !== "true" && env.OTEL_TRACES_EXPORTER !== "none";
}

/** What an error is: its type, which a span names as its `error.type`, and whether it's the server's own fault. */
export interface ErrorKind {
    type: string;
    fault: boolean;
}

/** What was thrown, as an error: itself if it is one, and otherwise an error that says what it was. */
export function toError(thrown: unknown): Error {
    if (thrown instanceof Error) {
        return thrown;
    }
    return new Error(String(thrown));
}

/** Tells what kind of error it is, @see ErrorKind. */
export type ClassifyError = (error: unknown) => ErrorKind;

/** Errors recorded on a span already, which a later handler of the same error leaves alone, @see traceError. */
const recorded = new WeakSet<object>();

/**
 * Record an error on a span, by its type. One that is the server's own fault fails the span,
 * with the error as its exception. One that the client caused, as a request that isn't valid,
 * doesn't, since the server did what it should, as OpenTelemetry's conventions for a server's
 * spans have it.
 */
export function recordError(span: Span, error: unknown, { type, fault }: ErrorKind): void {
    span.setAttribute(ATTR_ERROR_TYPE, type);
    if (!fault) {
        return;
    }

    const exception = toError(error);
    span.recordException(exception);
    span.setStatus({ code: SpanStatusCode.ERROR, message: exception.message });
    recorded.add(exception);
}

/**
 * Do some work in a span of its own, which is the active one while it runs, so that spans that
 * it starts are its children, and record what it throws, @see recordError.
 */
export function inSpan<T>(
    name: string,
    attributes: Attributes,
    work: (span: Span) => Promise<T>,
    classify: ClassifyError,
): Promise<T> {
    return tracer.startActiveSpan(name, { kind: SpanKind.SERVER, attributes }, async (span) => {
        try {
            return await work(span);
        } catch (error: unknown) {
            recordError(span, error, classify(error));
            throw error;
        } finally {
            span.end();
        }
    });
}

/**
 * Record an error that is the server's own fault in a span of its own, unless a span recorded
 * it already, as for one that happened before any span began.
 */
export function traceError(name: string, error: unknown, type: string): void {
    if (error instanceof Error && recorded.has(error)) {
        return;
    }

    const span = tracer.startSpan(name, { kind: SpanKind.SERVER });
    recordError(span, error, { type, fault: true });
    span.end();
}

/** How long a shutdown waits for the last spans to be sent, so that a collector that's gone doesn't hold it up. */
const FLUSH_TIMEOUT_MS = 3000;

/**
 * Start exporting traces over OTLP/HTTP, if the environment says where to, @see tracingEnabled.
 * To turn it on:
 *
 * 1. Set `OTEL_EXPORTER_OTLP_ENDPOINT`, or `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` for traces alone,
 *    to a collector or a service that takes OTLP over HTTP.
 * 2. If it needs a key, set `OTEL_EXPORTER_OTLP_HEADERS`, e.g. `api-key=<key>`. The exporter reads
 *    the rest of OpenTelemetry's variables itself, such as its timeout.
 * 3. To name the service other than `durachok-server`, set `OTEL_SERVICE_NAME`, and to describe
 *    it further, `OTEL_RESOURCE_ATTRIBUTES`.
 * 4. Start the server. The spans that are left go out when it stops.
 *
 * `OTEL_SDK_DISABLED=true` turns it off again.
 */
export async function startTracing(env: NodeJS.ProcessEnv = process.env): Promise<void> {
    if (!tracingEnabled(env)) {
        return;
    }

    const [
        { AsyncLocalStorageContextManager },
        { OTLPTraceExporter },
        resources,
        { BasicTracerProvider, BatchSpanProcessor },
    ] = await Promise.all([
        import("@opentelemetry/context-async-hooks"),
        import("@opentelemetry/exporter-trace-otlp-http"),
        import("@opentelemetry/resources"),
        import("@opentelemetry/sdk-trace-base"),
    ]);
    // A failed export is worth a warning, once the traces have somewhere to go.
    diag.setLogger(
        {
            error: (message, ...args) => logger.error({ args }, `tracing: ${message}`),
            warn: (message, ...args) => logger.warn({ args }, `tracing: ${message}`),
            info: () => {},
            debug: () => {},
            verbose: () => {},
        },
        DiagLogLevel.WARN,
    );

    // The environment's name for the service, if it gives one, wins over the server's own.
    const resource = resources
        .defaultResource()
        .merge(resources.resourceFromAttributes({ [ATTR_SERVICE_NAME]: SERVICE_NAME }))
        .merge(resources.detectResources({ detectors: [resources.envDetector] }));

    const provider = new BasicTracerProvider({
        resource,
        spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
    });
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    trace.setGlobalTracerProvider(provider);
    logger.info("tracing: exporting traces over OTLP/HTTP");

    // Send what's left before the server stops, then stop as the signal would have.
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.once(signal, () => {
            const timeout = new Promise<void>((resolve) => setTimeout(resolve, FLUSH_TIMEOUT_MS).unref());
            void Promise.race([provider.shutdown(), timeout]).finally(() => process.kill(process.pid, signal));
        });
    }
}
