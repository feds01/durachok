/**
 * The server's spans, recorded in memory: one for each socket event and each tRPC procedure,
 * which fails only for an error that is the server's own.
 */
import { SpanStatusCode, context, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
    BasicTracerProvider,
    InMemorySpanExporter,
    type ReadableSpan,
    SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { TRPCError } from "@trpc/server";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { inSpan, traceError, tracer } from "../src/lib/tracing";
import { createContext } from "../src/interface/context";
import { traceEvent } from "../src/interface/socket/tracing";
import { type AuthenticatedContext, createCallerFactory, publicProcedure, router } from "../src/interface/trpc";
import logger from "../src/lib/logger";

const exporter = new InMemorySpanExporter();

beforeAll(() => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    trace.setGlobalTracerProvider(new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }));
});

afterEach(() => exporter.reset());

/** The finished span with this name. */
function span(name: string): ReadableSpan {
    const found = exporter.getFinishedSpans().filter((finished) => finished.name === name);
    expect(found).toHaveLength(1);
    return found[0];
}

/** Whether a span recorded an exception, as a failure that is the server's own does. */
function hasException(finished: ReadableSpan): boolean {
    return finished.events.some(({ name }) => name === "exception");
}

describe("A socket event", () => {
    test("is handled in a span of its own", async () => {
        await traceEvent("join", "client-1", async () => {});

        const finished = span("socket join");
        expect(finished.status.code).toBe(SpanStatusCode.UNSET);
        expect(finished.attributes).toMatchObject({ "rpc.method": "join", "socket.io.client_id": "client-1" });
    });

    test("fails its span with an error that is the server's own", async () => {
        const failing = () =>
            traceEvent("move", "client-1", async () => {
                throw new Error("the database went away");
            });

        await expect(failing()).rejects.toThrow("the database went away");

        const finished = span("socket move");
        expect(finished.status).toEqual({ code: SpanStatusCode.ERROR, message: "the database went away" });
        expect(hasException(finished)).toBe(true);
    });

    test("leaves its span unfailed for an error that the client caused, and names it", async () => {
        const failing = () =>
            traceEvent("kick", "client-1", async () => {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Only the owner can kick" });
            });

        await expect(failing()).rejects.toThrow("Only the owner can kick");

        const finished = span("socket kick");
        expect(finished.status.code).toBe(SpanStatusCode.UNSET);
        expect(finished.attributes["error.type"]).toBe("unauthorized");
        expect(hasException(finished)).toBe(false);
    });
});

describe("A tRPC procedure", () => {
    const appRouter = router({
        ok: publicProcedure.query(() => "ok"),
        refused: publicProcedure.query(() => {
            throw new TRPCError({ code: "BAD_REQUEST", message: "That isn't valid" });
        }),
        broken: publicProcedure.query(() => {
            throw new Error("the disk is full");
        }),
    });
    const session: AuthenticatedContext = {
        ...createContext(logger),
        ip: "127.0.0.1",
        token: undefined,
        rawTokens: undefined,
    };
    const caller = createCallerFactory(appRouter)(session);

    test("runs in a span of its own", async () => {
        expect(await caller.ok()).toBe("ok");

        const finished = span("trpc ok");
        expect(finished.status.code).toBe(SpanStatusCode.UNSET);
        expect(finished.attributes).toMatchObject({
            "rpc.system": "trpc",
            "rpc.method": "ok",
            "rpc.trpc.type": "query",
        });
    });

    test("fails its span with an error that is the server's own", async () => {
        await expect(caller.broken()).rejects.toThrow("the disk is full");

        const finished = span("trpc broken");
        expect(finished.status.code).toBe(SpanStatusCode.ERROR);
        expect(finished.attributes["error.type"]).toBe("INTERNAL_SERVER_ERROR");
        expect(hasException(finished)).toBe(true);
    });

    test("leaves its span unfailed for an error that the client caused, and names it", async () => {
        await expect(caller.refused()).rejects.toThrow("That isn't valid");

        const finished = span("trpc refused");
        expect(finished.status.code).toBe(SpanStatusCode.UNSET);
        expect(finished.attributes["error.type"]).toBe("BAD_REQUEST");
    });
});

describe("Spans", () => {
    test("started while another is active are its children, across awaits", async () => {
        await inSpan(
            "outer",
            {},
            async () => {
                await Bun.sleep(1);
                tracer.startSpan("inner").end();
            },
            () => ({ type: "internal", fault: true }),
        );

        expect(span("inner").parentSpanContext?.spanId).toBe(span("outer").spanContext().spanId);
    });

    test("record an error that no span saw, and leave one that a span recorded already", async () => {
        const recordedAlready = new Error("recorded");
        await inSpan(
            "handled",
            {},
            async () => {
                throw recordedAlready;
            },
            () => ({ type: "internal", fault: true }),
        ).catch(() => {});

        traceError("trpc request", recordedAlready, "INTERNAL_SERVER_ERROR");
        traceError("trpc request", new Error("before any procedure"), "INTERNAL_SERVER_ERROR");

        const strays = exporter.getFinishedSpans().filter(({ name }) => name === "trpc request");
        expect(strays.map(({ status }) => status.message)).toEqual(["before any procedure"]);
    });
});
