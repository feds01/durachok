import { describe, expect, test } from "bun:test";

import { tracingEnabled } from "./tracing";

describe("tracingEnabled", () => {
    test("is off without an OTLP endpoint", () => {
        expect(tracingEnabled({})).toBe(false);
        expect(tracingEnabled({ OTEL_SERVICE_NAME: "durachok" })).toBe(false);
    });

    test("is on with an endpoint for all signals, or for traces alone", () => {
        expect(tracingEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318" })).toBe(true);
        expect(tracingEnabled({ OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://localhost:4318/v1/traces" })).toBe(true);
    });

    test("is off when the SDK or its trace exporter is turned off", () => {
        const endpoint = { OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318" };
        expect(tracingEnabled({ ...endpoint, OTEL_SDK_DISABLED: "true" })).toBe(false);
        expect(tracingEnabled({ ...endpoint, OTEL_TRACES_EXPORTER: "none" })).toBe(false);
    });
});
