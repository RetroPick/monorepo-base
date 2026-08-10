import { MarketsApiError } from "@retropick/polymarket";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getMarketsApiBaseUrl } from "@/shared/lib/marketsRuntimeEnv";

import { isSameQueryErrorKind, mapQueryError, userFacingErrorMessage } from "../lib/errors";

describe("mapQueryError", () => {
  it("maps malformed API errors to actionable UI kind", () => {
    const error = new MarketsApiError("Malformed JSON response", {
      status: 200,
      code: "malformed",
    });

    const mapped = mapQueryError(error);

    expect(mapped.kind).toBe("malformed");
    expect(userFacingErrorMessage(mapped.kind)).not.toBe("malformed");
    expect(userFacingErrorMessage(mapped.kind)).toMatch(/8080|NEXT_PUBLIC_API_BASE_URL/);
  });

  it("maps timeout and rate_limit codes", () => {
    const timeout = new MarketsApiError("Request timed out", { status: 0, code: "timeout" });
    const rateLimit = new MarketsApiError("slow down", { status: 429, code: "rate_limit" });

    expect(mapQueryError(timeout).kind).toBe("timeout");
    expect(mapQueryError(rateLimit).kind).toBe("rate_limit");
    expect(userFacingErrorMessage("timeout")).toMatch(/timed out/i);
    expect(userFacingErrorMessage("rate_limit")).toMatch(/too many requests/i);
  });
});

describe("isSameQueryErrorKind", () => {
  it("returns true when both errors share the same mapped kind", () => {
    const a = new MarketsApiError("Malformed JSON response", { status: 200, code: "malformed" });
    const b = new MarketsApiError("Malformed JSON response", { status: 200, code: "malformed" });

    expect(isSameQueryErrorKind(a, b)).toBe(true);
  });

  it("returns false for different kinds", () => {
    const malformed = new MarketsApiError("Malformed JSON response", { status: 200, code: "malformed" });
    const network = new MarketsApiError("Network request failed", { status: 0, code: "network" });

    expect(isSameQueryErrorKind(malformed, network)).toBe(false);
  });
});

describe("getMarketsApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to local BFF in non-production when unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(getMarketsApiBaseUrl()).toBe("http://127.0.0.1:8080");
  });

  it("prefers NEXT_PUBLIC_API_BASE_URL over alias", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://bff.example.com/");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://other.example.com");

    expect(getMarketsApiBaseUrl()).toBe("https://bff.example.com");
  });

  it("accepts NEXT_PUBLIC_API_URL when base URL is unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api-url.example.com/");

    expect(getMarketsApiBaseUrl()).toBe("https://api-url.example.com");
  });

  it("throws in production when unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(() => getMarketsApiBaseUrl()).toThrow("NEXT_PUBLIC_API_BASE_URL is not configured");
  });
});
